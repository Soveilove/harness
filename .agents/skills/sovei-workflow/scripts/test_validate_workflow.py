import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.dont_write_bytecode = True
shutil.rmtree(Path(__file__).parent / "__pycache__", ignore_errors=True)

from validate_workflow import ValidationError, validate


WORKFLOW = '''schema_version: 1
workflow_version: "0.2.0"
usage: "USAGE.md"
invocation:
  max_stages: 1
  chaining: forbidden
  skill_map: "skill-map.yaml"
  report_skills: true
stage_order:
  - load
  - grill
  - spec
stages:
  load:
    status: active
    required_artifacts: []
    next: ["grill"]
  grill:
    status: active
    required_artifacts: ["decision-log.md"]
    next: ["spec"]
  spec:
    status: active
    required_artifacts: ["spec.md"]
    next: []
'''

SKILL_MAP = '''schema_version: 1
workflow_version: "0.2.0"
skills:
  sovei-workflow:
    source: repository
    status: active
stages:
  load:
    required_skills: ["sovei-workflow"]
    third_party_skills: []
    candidate_third_party_skills: []
    alternative_third_party_skills: []
  grill:
    required_skills: ["sovei-workflow"]
    third_party_skills: []
    candidate_third_party_skills: []
    alternative_third_party_skills: []
  spec:
    required_skills: ["sovei-workflow"]
    third_party_skills: []
    candidate_third_party_skills: []
    alternative_third_party_skills: []
'''


def state(completed, current):
    completed_lines = "[]" if not completed else "\n" + "\n".join(f"  - {item}" for item in completed)
    return f'''schema_version: 1
feature: specs/test-feature
risk_level: S1
current_stage: {current}
status: in_progress
workflow_version: "0.2.0"
baseline_commit: test
completed_stages: {completed_lines}
wayfinder: not_required
next_stage: {current}
open_decisions: []
blocked_by: []
updated_at: 2026-07-21T00:00:00+08:00
'''


class ValidateWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary_directory.name)
        workflow_directory = self.root / "harness" / "workflows" / "sovei"
        workflow_directory.mkdir(parents=True)
        (workflow_directory / "workflow.yaml").write_text(WORKFLOW, encoding="utf-8")
        (workflow_directory / "skill-map.yaml").write_text(SKILL_MAP, encoding="utf-8")
        (workflow_directory / "USAGE.md").write_text("# Usage\n", encoding="utf-8")
        self.feature = self.root / "specs" / "test-feature"
        self.feature.mkdir(parents=True)

    def tearDown(self):
        self.temporary_directory.cleanup()

    def write_state(self, completed, current):
        (self.feature / "workflow-state.yaml").write_text(state(completed, current), encoding="utf-8")

    def test_accepts_consistent_state(self):
        self.write_state(["load"], "grill")
        result = validate(self.root, "specs/test-feature")
        self.assertTrue(result["valid"])
        self.assertEqual(result["current_stage"], "grill")

    def test_rejects_missing_completed_artifact(self):
        self.write_state(["load", "grill"], "spec")
        with self.assertRaisesRegex(ValidationError, "missing decision-log.md"):
            validate(self.root, "specs/test-feature")

    def test_rejects_illegal_transition(self):
        self.write_state(["load"], "spec")
        with self.assertRaisesRegex(ValidationError, "illegal transition"):
            validate(self.root, "specs/test-feature")

    def test_rejects_stage_chaining_policy(self):
        workflow_path = self.root / "harness" / "workflows" / "sovei" / "workflow.yaml"
        workflow_path.write_text(WORKFLOW.replace("max_stages: 1", "max_stages: 2"), encoding="utf-8")
        self.write_state(["load"], "grill")
        with self.assertRaisesRegex(ValidationError, "exactly one stage"):
            validate(self.root, "specs/test-feature")

    def test_rejects_incomplete_skill_map(self):
        skill_map_path = self.root / "harness" / "workflows" / "sovei" / "skill-map.yaml"
        skill_map_path.write_text(SKILL_MAP.replace("  spec:\n", "  omitted-spec:\n"), encoding="utf-8")
        self.write_state(["load"], "grill")
        with self.assertRaisesRegex(ValidationError, "Skill map stage mismatch"):
            validate(self.root, "specs/test-feature")

    def test_rejects_missing_usage_guide(self):
        (self.root / "harness" / "workflows" / "sovei" / "USAGE.md").unlink()
        self.write_state(["load"], "grill")
        with self.assertRaisesRegex(ValidationError, "missing usage guide"):
            validate(self.root, "specs/test-feature")


if __name__ == "__main__":
    unittest.main()
