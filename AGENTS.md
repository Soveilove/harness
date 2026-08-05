# harness

## Sovei Workflow

This project uses [Sovei](https://github.com/sovei) for structured development workflows.

### Key Commands
- `sovei context build --stage <stage> --feature <feature>`: Get stage prompt + context pack
- `sovei context build --stage spec --feature <feature> --cross-feature`: Include other features decision logs
- `sovei workflow <stage> <feature>`: Prepare a workflow stage
- `sovei workflow <stage> <feature> --complete`: Complete a stage and advance
- `sovei workflow confirm <feature> --stage <stage> --role <role> --by <name> --reference <ref>`: Confirm a gate
- `sovei workflow bootstrap <feature>`: Start a new feature
- `sovei project onboard --evidence-only`: Collect evidence for agent analysis (existing projects)
- `sovei governance review-pack generate <feature>`: Render tech-review.md + product-review.md from reconciliation.md
- `sovei governance review-pack import <feature> --product <file> --by <name> --reference <ref>`: Import PM confirmation

### Workflow Stages

```
load → grill → wayfind → spec → scope → plan → tasks → implement → converge → verify → learn → sync
```

### Confirmation Gates

- After **spec** (S2/S3 risk): product + tech confirmation required before scope
- After **verify** (always): product + tech confirmation required before learn
- Override: `sovei workflow override-confirm <feature> --stage <stage> --role <role> --by <name> --reason <reason>`

### Reconciliation

The spec stage produces `reconciliation.md` — a structured alignment document that:
1. Translates PM requirements into technical understanding
2. Restores current state (why code is the way it is, referencing prior feature decisions)
3. Lists solutions and their costs
4. Extracts questions for product and tech confirmation

Run `sovei governance review-pack generate <feature>` to render tech-review.md and product-review.md from it.
