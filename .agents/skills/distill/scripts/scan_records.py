#!/usr/bin/env python3
"""Scan project-local records and extract structured fields for distillation.

Usage:
    python scan_records.py --source <path> --type <debug|specs> [--output <file>]

Outputs JSON array of records with extracted fields.
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path


def parse_debug_record(content, filename):
    """Parse a single .debug-records/ markdown entry."""
    record = {"file": filename, "type": "debug"}
    # Extract F type
    m = re.search(r"F\s*类型.*?F(\d)", content)
    if m:
        record["f_type"] = int(m.group(1))
    else:
        record["f_type"] = None
    # Extract title (first ### heading)
    m = re.search(r"^###\s+(.+)$", content, re.MULTILINE)
    if m:
        record["title"] = m.group(1).strip()
    # Extract structured fields
    for field in ["日期", "症状", "根因", "修复", "相关文件"]:
        pattern = rf"\*\*{field}\*\*:\s*(.+?)(?=\n- \*\*|\n###|\Z)"
        m = re.search(pattern, content, re.DOTALL)
        if m:
            record[field] = m.group(1).strip()
    return record


def parse_spec_artifacts(spec_dir):
    """Parse specs/<feature>/ directory for artifacts."""
    records = []
    feature_name = Path(spec_dir).name
    artifacts = ["spec.md", "scope.md", "plan.md", "tasks.md",
                 "evidence.md", "learning-report.md", "convergence-report.md"]
    for art in artifacts:
        path = os.path.join(spec_dir, art)
        if os.path.isfile(path):
            content = Path(path).read_text(encoding="utf-8")
            record = {
                "file": f"specs/{feature_name}/{art}",
                "type": "specs",
                "feature": feature_name,
                "artifact": art.replace(".md", ""),
                "size": len(content),
            }
            # Extract headings as structure
            headings = re.findall(r"^#+\s+(.+)$", content, re.MULTILINE)
            record["headings"] = headings[:20]
            records.append(record)
    # Check workflow-state.yaml
    state_path = os.path.join(spec_dir, "workflow-state.yaml")
    if os.path.isfile(state_path):
        content = Path(state_path).read_text(encoding="utf-8")
        records.append({
            "file": f"specs/{feature_name}/workflow-state.yaml",
            "type": "specs",
            "feature": feature_name,
            "artifact": "workflow-state",
            "content_preview": content[:500],
        })
    return records


def scan_debug(source_dir):
    """Scan .debug-records/ directory."""
    records = []
    if not os.path.isdir(source_dir):
        print(f"Warning: {source_dir} does not exist", file=sys.stderr)
        return records
    for entry in sorted(os.listdir(source_dir)):
        if not entry.endswith(".md"):
            continue
        path = os.path.join(source_dir, entry)
        content = Path(path).read_text(encoding="utf-8")
        record = parse_debug_record(content, entry)
        records.append(record)
    return records


def scan_specs(source_dir):
    """Scan specs/ directory for all Feature artifacts."""
    records = []
    if not os.path.isdir(source_dir):
        print(f"Warning: {source_dir} does not exist", file=sys.stderr)
        return records
    for entry in sorted(os.listdir(source_dir)):
        spec_path = os.path.join(source_dir, entry)
        if os.path.isdir(spec_path):
            records.extend(parse_spec_artifacts(spec_path))
    return records


def main():
    parser = argparse.ArgumentParser(
        description="Scan project records for distillation"
    )
    parser.add_argument("--source", required=True, help="Directory to scan")
    parser.add_argument(
        "--type", required=True, choices=["debug", "specs"],
        help="Record type: debug (.debug-records/) or specs (specs/)"
    )
    parser.add_argument("--output", help="Output file (default: stdout)")
    args = parser.parse_args()

    source = os.path.abspath(args.source)
    if args.type == "debug":
        records = scan_debug(source)
    else:
        records = scan_specs(source)

    # Summary
    summary = {
        "source": source,
        "type": args.type,
        "total_records": len(records),
    }
    if args.type == "debug":
        f_counts = {}
        for r in records:
            ft = r.get("f_type")
            if ft is not None:
                f_counts[f"F{ft}"] = f_counts.get(f"F{ft}", 0) + 1
        summary["f_type_distribution"] = f_counts

    output = {"summary": summary, "records": records}
    json_str = json.dumps(output, ensure_ascii=False, indent=2)

    if args.output:
        Path(args.output).write_text(json_str, encoding="utf-8")
        print(f"Written {len(records)} records to {args.output}", file=sys.stderr)
    else:
        print(json_str)


if __name__ == "__main__":
    main()