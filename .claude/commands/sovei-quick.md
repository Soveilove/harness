# Sovei Quick

Use the repository's local Quick CLI as the only authority for Quick semantics.

1. Ask the user to state:
   - the exact target change;
   - files or symbols allowed to change;
   - files or areas explicitly excluded;
   - tests or checks they expect to run.
2. Before editing, run the local CLI in JSON mode from the workspace root:
   `node packages/sovei-core/dist/cli/index.js quick "<target>" --paths "<paths>" --exclude "<exclusions>" --symbols "<symbols>" --test "<tests>" --json`
   Omit empty options. If the result is escalated or stopped, do not edit; show the reason and ask whether to enter the full Sovei workflow.
3. Show the returned confirmation and scope. Do not copy or recreate Quick risk rules in this command.
4. Only after the user confirms, make the requested change within the declared scope.
5. Run the same CLI command again after the change and report its JSON result. A completed result requires a real Git diff within the declared scope; no-diff, out-of-scope, risk, baseline, or unverified-test results are not completion.

This command is a thin Claude Code wrapper. The `sovei quick` CLI and shared QuickRun contract remain authoritative. The usage log is append-only and can identify a run with `run-start` but no `run-end` as interrupted across Claude Code conversations; it does not contain the original prompt or enough information to resume editing automatically. A new conversation must restate and reconfirm the target before making changes. Never run checkout, reset, revert, or other automatic rollback commands.
