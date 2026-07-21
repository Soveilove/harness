#!/usr/bin/env python3

import argparse
import json
import os
import sys
from pathlib import Path


class ValidationError(Exception):
    pass


def parse_scalar(value):
    if value == "":
        return None
    if value.startswith("[") or value.startswith("{") or value.startswith('"'):
        return json.loads(value)
    if value.startswith("'") and value.endswith("'"):
        return value[1:-1]
    if value in {"true", "false"}:
        return value == "true"
    if value in {"null", "~"}:
        return None
    try:
        return int(value)
    except ValueError:
        return value


def parse_yaml_subset(path):
    tokens = []
    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw_line.strip() or raw_line.lstrip().startswith("#"):
            continue
        indent = len(raw_line) - len(raw_line.lstrip(" "))
        if "\t" in raw_line[:indent] or indent % 2:
            raise ValidationError(f"{path}:{line_number}: indentation must use two spaces")
        tokens.append((indent, raw_line.strip(), line_number))

    if not tokens:
        raise ValidationError(f"{path}: file is empty")

    def parse_block(index, indent):
        is_list = tokens[index][1].startswith("- ")
        container = [] if is_list else {}

        while index < len(tokens):
            current_indent, content, line_number = tokens[index]
            if current_indent < indent:
                break
            if current_indent > indent:
                raise ValidationError(f"{path}:{line_number}: unexpected indentation")

            if is_list:
                if not content.startswith("- "):
                    break
                raw_value = content[2:].strip()
                if raw_value:
                    container.append(parse_scalar(raw_value))
                    index += 1
                else:
                    if index + 1 >= len(tokens) or tokens[index + 1][0] <= indent:
                        container.append(None)
                        index += 1
                    else:
                        value, index = parse_block(index + 1, tokens[index + 1][0])
                        container.append(value)
            else:
                if content.startswith("- "):
                    break
                if ":" not in content:
                    raise ValidationError(f"{path}:{line_number}: expected key: value")
                key, raw_value = content.split(":", 1)
                key = key.strip()
                raw_value = raw_value.strip()
                if not key or key in container:
                    raise ValidationError(f"{path}:{line_number}: invalid or duplicate key")
                if raw_value:
                    container[key] = parse_scalar(raw_value)
                    index += 1
                elif index + 1 < len(tokens) and tokens[index + 1][0] > indent:
                    value, index = parse_block(index + 1, tokens[index + 1][0])
                    container[key] = value
                else:
                    container[key] = {}
                    index += 1

        return container, index

    result, next_index = parse_block(0, tokens[0][0])
    if next_index != len(tokens) or not isinstance(result, dict):
        raise ValidationError(f"{path}: unsupported YAML structure")
    return result


def dump_yaml_subset(value, indent=0):
    prefix = " " * indent
    lines = []
    if isinstance(value, dict):
        for key, item in value.items():
            if isinstance(item, dict):
                lines.append(f"{prefix}{key}:")
                lines.extend(dump_yaml_subset(item, indent + 2))
            elif isinstance(item, list):
                if not item:
                    lines.append(f"{prefix}{key}: []")
                else:
                    lines.append(f"{prefix}{key}:")
                    for entry in item:
                        if isinstance(entry, (dict, list)):
                            raise ValidationError("nested list values are not supported")
                        lines.append(f"{' ' * (indent + 2)}- {json.dumps(entry, ensure_ascii=False)}")
            else:
                lines.append(f"{prefix}{key}: {json.dumps(item, ensure_ascii=False)}")
        return lines
    raise ValidationError("YAML root must be a mapping")


def write_yaml_subset(path, value):
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    temporary_path.write_text("\n".join(dump_yaml_subset(value)) + "\n", encoding="utf-8")
    os.replace(temporary_path, path)


def require_mapping(value, label):
    if not isinstance(value, dict):
        raise ValidationError(f"{label} must be a mapping")
    return value


def require_list(value, label):
    if not isinstance(value, list):
        raise ValidationError(f"{label} must be a list")
    return value


def resolve_inside(root, value, label):
    path = Path(value)
    resolved = path.resolve() if path.is_absolute() else (root / path).resolve()
    try:
        resolved.relative_to(root)
    except ValueError as error:
        raise ValidationError(f"{label} must stay inside repository: {resolved}") from error
    return resolved


def validate(repo_root, feature_value, expected_stage=None):
    root = Path(repo_root).resolve()
    feature = resolve_inside(root, feature_value, "feature")
    state_path = feature / "workflow-state.yaml"
    if not state_path.is_file():
        raise ValidationError(f"missing state file: {state_path}")

    workflow_candidates = [
        root / "harness" / "workflows" / "sovei" / "workflow.yaml",
        root / ".specify" / "workflows" / "sovei" / "workflow.yaml",
    ]
    workflow_path = next((path for path in workflow_candidates if path.is_file()), None)
    if workflow_path is None:
        raise ValidationError("missing Sovei workflow definition")

    workflow = parse_yaml_subset(workflow_path)
    state = parse_yaml_subset(state_path)

    usage_value = workflow.get("usage")
    if not isinstance(usage_value, str) or not usage_value:
        raise ValidationError("workflow.usage must be a path")
    usage_path = resolve_inside(workflow_path.parent, usage_value, "usage guide")
    if not usage_path.is_file():
        raise ValidationError(f"missing usage guide: {usage_path}")

    stages = require_mapping(workflow.get("stages"), "workflow.stages")
    stage_order = require_list(workflow.get("stage_order"), "workflow.stage_order")
    control_actions = require_list(workflow.get("control_actions"), "workflow.control_actions")
    if "reopen" not in control_actions:
        raise ValidationError("workflow must register the reopen control action")
    rework = require_mapping(workflow.get("rework"), "workflow.rework")
    history_artifact = rework.get("history_artifact")
    if not isinstance(history_artifact, str) or not history_artifact:
        raise ValidationError("workflow.rework.history_artifact must be a path")
    completed = require_list(state.get("completed_stages"), "state.completed_stages")

    invocation = require_mapping(workflow.get("invocation"), "workflow.invocation")
    if invocation.get("max_stages") != 1 or invocation.get("chaining") != "forbidden":
        raise ValidationError("workflow must enforce exactly one stage per invocation")
    if invocation.get("report_skills") is not True:
        raise ValidationError("workflow must require stage Skill reporting")

    skill_map_value = invocation.get("skill_map")
    if not isinstance(skill_map_value, str) or not skill_map_value:
        raise ValidationError("workflow.invocation.skill_map must be a path")
    skill_map_path = resolve_inside(workflow_path.parent, skill_map_value, "Skill map")
    if not skill_map_path.is_file():
        raise ValidationError(f"missing Skill map: {skill_map_path}")
    skill_map = parse_yaml_subset(skill_map_path)
    if skill_map.get("workflow_version") != workflow.get("workflow_version"):
        raise ValidationError("Skill map workflow version does not match workflow definition")

    skill_definitions = require_mapping(skill_map.get("skills"), "skill_map.skills")
    stage_skills = require_mapping(skill_map.get("stages"), "skill_map.stages")
    missing_stage_skills = [stage for stage in stage_order if stage not in stage_skills]
    unknown_stage_skills = [stage for stage in stage_skills if stage not in stages]
    if missing_stage_skills or unknown_stage_skills:
        details = []
        if missing_stage_skills:
            details.append(f"missing: {', '.join(missing_stage_skills)}")
        if unknown_stage_skills:
            details.append(f"unknown: {', '.join(unknown_stage_skills)}")
        raise ValidationError(f"Skill map stage mismatch ({'; '.join(details)})")

    skill_fields = [
        "required_skills",
        "third_party_skills",
        "candidate_third_party_skills",
        "alternative_third_party_skills",
    ]
    for stage in stage_order:
        contract = require_mapping(stage_skills[stage], f"skill_map.stages.{stage}")
        for field in skill_fields:
            references = require_list(contract.get(field), f"skill_map.stages.{stage}.{field}")
            for skill in references:
                if skill not in skill_definitions:
                    raise ValidationError(f"unknown Skill {skill} in {stage}.{field}")

    required_state_fields = [
        "schema_version",
        "feature",
        "risk_level",
        "current_stage",
        "status",
        "workflow_version",
        "baseline_commit",
        "next_stage",
        "open_decisions",
        "blocked_by",
        "revision",
        "reopened_stages",
        "updated_at",
    ]
    missing_fields = [name for name in required_state_fields if name not in state]
    if missing_fields:
        raise ValidationError(f"state missing fields: {', '.join(missing_fields)}")

    if state["workflow_version"] != workflow.get("workflow_version"):
        raise ValidationError(
            f"workflow version mismatch: state={state['workflow_version']} "
            f"definition={workflow.get('workflow_version')}"
        )
    if state["feature"].replace("\\", "/") != feature.relative_to(root).as_posix():
        raise ValidationError("state.feature does not match selected Feature path")
    if len(completed) != len(set(completed)):
        raise ValidationError("completed_stages contains duplicates")
    revision = state["revision"]
    if not isinstance(revision, int) or revision < 0:
        raise ValidationError("state.revision must be a non-negative integer")
    reopened_stages = require_list(state["reopened_stages"], "state.reopened_stages")
    for stage in reopened_stages:
        if stage not in stages:
            raise ValidationError(f"unknown reopened stage: {stage}")
    history_path = resolve_inside(feature, history_artifact, "workflow history")
    if revision > 0 and not history_path.is_file():
        raise ValidationError(f"revision {revision} is missing {history_artifact}")

    positions = []
    for stage in completed:
        if stage not in stages or stage not in stage_order:
            raise ValidationError(f"unknown completed stage: {stage}")
        positions.append(stage_order.index(stage))
        stage_contract = require_mapping(stages[stage], f"workflow.stages.{stage}")
        artifacts = require_list(
            stage_contract.get("required_artifacts", []),
            f"workflow.stages.{stage}.required_artifacts",
        )
        for artifact in artifacts:
            artifact_path = resolve_inside(feature, artifact, f"artifact for {stage}")
            if not artifact_path.is_file():
                raise ValidationError(f"completed stage {stage} is missing {artifact}")
    if positions != sorted(positions):
        raise ValidationError("completed_stages is not in workflow order")
    if completed and completed[0] != stage_order[0]:
        raise ValidationError(f"completed_stages must start at {stage_order[0]}")
    for previous, successor in zip(completed, completed[1:]):
        allowed = require_list(stages[previous].get("next", []), f"workflow.stages.{previous}.next")
        if successor not in allowed:
            raise ValidationError(f"illegal completed transition: {previous} -> {successor}")

    current_stage = state["current_stage"]
    next_stage = state["next_stage"]
    if current_stage not in stages:
        raise ValidationError(f"unknown current_stage: {current_stage}")
    status = state["status"]
    if status not in {"in_progress", "completed"}:
        raise ValidationError("state.status must be in_progress or completed")
    is_terminal = status == "completed"
    if is_terminal:
        if current_stage != stage_order[-1] or next_stage is not None:
            raise ValidationError("completed workflow must end at the final stage with next_stage null")
        if not completed or completed[-1] != current_stage:
            raise ValidationError("completed workflow must include the final stage")
        final_next = require_list(stages[current_stage].get("next", []), f"workflow.stages.{current_stage}.next")
        if final_next:
            raise ValidationError("completed workflow final stage must not have a successor")
    else:
        if next_stage != current_stage:
            raise ValidationError("next_stage must equal the stage waiting to execute")
        if completed:
            previous = completed[-1]
            allowed = require_list(stages[previous].get("next", []), f"workflow.stages.{previous}.next")
            if current_stage not in allowed:
                raise ValidationError(f"illegal transition: {previous} -> {current_stage}")
        elif current_stage != stage_order[0]:
            raise ValidationError(f"new Feature must start at {stage_order[0]}")
    if expected_stage and current_stage != expected_stage:
        raise ValidationError(f"expected stage {expected_stage}, found {current_stage}")

    open_decisions = require_list(state["open_decisions"], "state.open_decisions")
    blocked_by = require_list(state["blocked_by"], "state.blocked_by")
    current_contract = require_mapping(stages[current_stage], f"workflow.stages.{current_stage}")
    current_skill_contract = require_mapping(
        stage_skills[current_stage], f"skill_map.stages.{current_stage}"
    )

    return {
        "valid": True,
        "feature": feature.relative_to(root).as_posix(),
        "risk_level": state["risk_level"],
        "workflow_version": state["workflow_version"],
        "completed_stages": completed,
        "current_stage": current_stage,
        "next_stage": next_stage,
        "stage_status": current_contract.get("status"),
        "status": status,
        "open_decisions": open_decisions,
        "blocked_by": blocked_by,
        "revision": revision,
        "reopened_stages": reopened_stages,
        "stage_skills": {
            field: current_skill_contract[field]
            for field in skill_fields
        },
        "workflow_file": workflow_path.relative_to(root).as_posix(),
        "usage_file": usage_path.relative_to(root).as_posix(),
        "skill_map_file": skill_map_path.relative_to(root).as_posix(),
        "state_file": state_path.relative_to(root).as_posix(),
    }


def main():
    parser = argparse.ArgumentParser(description="Validate Sovei workflow state without modifying files.")
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--feature", required=True)
    parser.add_argument("--expect-stage")
    args = parser.parse_args()

    try:
        result = validate(args.repo_root, args.feature, args.expect_stage)
    except (OSError, ValueError, json.JSONDecodeError, ValidationError) as error:
        print(json.dumps({"valid": False, "error": str(error)}, ensure_ascii=False, indent=2))
        return 1

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
