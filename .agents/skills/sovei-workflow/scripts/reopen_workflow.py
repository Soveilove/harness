#!/usr/bin/env python3

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

from validate_workflow import (
    ValidationError,
    parse_yaml_subset,
    resolve_inside,
    validate,
    write_yaml_subset,
)


def append_history(existing, timestamp, revision, source, target, reason):
    header = (
        "# Workflow History\n\n"
        "| Timestamp | Revision | Action | From | Target | Reason |\n"
        "|---|---:|---|---|---|---|\n"
    )
    content = existing if existing else header
    if not content.endswith("\n"):
        content += "\n"
    safe_reason = reason.replace("|", "\\|").replace("\r", " ").replace("\n", " ")
    return content + f"| {timestamp} | {revision} | reopen | {source} | {target} | {safe_reason} |\n"


def reopen(repo_root, feature_value, target_stage, reason, timestamp=None):
    if not reason or not reason.strip():
        raise ValidationError("reopen reason must not be empty")

    result = validate(repo_root, feature_value)
    root = Path(repo_root).resolve()
    feature = resolve_inside(root, feature_value, "feature")
    state_path = feature / "workflow-state.yaml"
    workflow_path = root / result["workflow_file"]
    state = parse_yaml_subset(state_path)
    workflow = parse_yaml_subset(workflow_path)
    stage_order = workflow["stage_order"]
    completed = state["completed_stages"]

    if target_stage not in stage_order:
        raise ValidationError(f"unknown reopen target: {target_stage}")
    if target_stage not in completed:
        raise ValidationError(f"reopen target is not completed: {target_stage}")

    target_position = stage_order.index(target_stage)
    invalidated = [stage for stage in completed if stage_order.index(stage) >= target_position]
    state["completed_stages"] = [
        stage for stage in completed if stage_order.index(stage) < target_position
    ]
    source_stage = state["current_stage"]
    state["current_stage"] = target_stage
    state["next_stage"] = target_stage
    state["status"] = "in_progress"
    state["revision"] += 1
    if target_stage not in state["reopened_stages"]:
        state["reopened_stages"].append(target_stage)
    timestamp = timestamp or datetime.now().astimezone().replace(microsecond=0).isoformat()
    state["updated_at"] = timestamp

    history_path = resolve_inside(feature, workflow["rework"]["history_artifact"], "workflow history")
    old_state = state_path.read_text(encoding="utf-8")
    old_history = history_path.read_text(encoding="utf-8") if history_path.exists() else None
    new_history = append_history(
        old_history, timestamp, state["revision"], source_stage, target_stage, reason.strip()
    )

    try:
        history_path.write_text(new_history, encoding="utf-8")
        write_yaml_subset(state_path, state)
        validated = validate(root, feature.relative_to(root).as_posix(), target_stage)
    except Exception:
        state_path.write_text(old_state, encoding="utf-8")
        if old_history is None:
            history_path.unlink(missing_ok=True)
        else:
            history_path.write_text(old_history, encoding="utf-8")
        raise

    return {
        **validated,
        "action": "reopen",
        "from_stage": source_stage,
        "target_stage": target_stage,
        "invalidated_stages": invalidated,
        "history_file": history_path.relative_to(root).as_posix(),
    }


def main():
    parser = argparse.ArgumentParser(description="Reopen one completed Sovei stage.")
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--feature", required=True)
    parser.add_argument("--target-stage", required=True)
    parser.add_argument("--reason", required=True)
    args = parser.parse_args()

    try:
        result = reopen(args.repo_root, args.feature, args.target_stage, args.reason)
    except (OSError, ValueError, json.JSONDecodeError, ValidationError) as error:
        print(json.dumps({"valid": False, "error": str(error)}, ensure_ascii=False, indent=2))
        return 1

    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
