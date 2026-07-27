---
description: Scan project records and distill knowledge candidates into harness
---

Read `.agents/skills/distill/SKILL.md` and execute the distill workflow. Treat `$ARGUMENTS` as `--source <path> --type <debug|specs>`. If no arguments, default to `--source .debug-records/ --type debug`. Run `scripts/scan_records.py` first, then cluster and generate a proposal report for manual review.