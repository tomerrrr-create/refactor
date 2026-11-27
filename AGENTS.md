# Repository guidance

Before starting repository work, read the current root [Readme.md](Readme.md) to understand the application's architecture, behavior, workflows, and relevant validation guidance. If documentation contradicts the implementation, consult the relevant source code as the ground truth.

- Work on the application by default; exclude the experimental video Studio unless explicitly requested.
- Studio tests are not required for the current app-only work. Still run relevant application and shared-infrastructure checks; reassess Studio validation when Studio work is explicitly requested.
- Keep changes focused on the requested task; avoid unrelated refactors.
- Preserve compatibility with older artwork and recipe files, saved profiles, and Undo/Redo behavior.
- Select relevant validation using Readme.md. For UI changes, also run browser checks when available. Report what passed, failed, or was not run, including blockers; do not rely on a fixed test count.
- When behavior changes, update the relevant Readme.md sections instead of appending contradictory notes.
- Preserve existing and concurrent changes. Never merge to main without explicit user approval.

## Simulation Layout playground

- Develop regular product and simulation defaults on `work` and release approved changes to `main` through the normal promotion workflow.
- Keep the Simulation Mode Layout editor and its experimental settings interfaces on `experiment/simulation-layout`. Develop editor changes there and never merge that branch into `work` or `main`.
- After pushing an approved update to `main`, fetch the remote refs and merge the updated `origin/main` into `experiment/simulation-layout` in the same task. Preserve the editor, its settings interfaces, and recipe compatibility when resolving conflicts. Run the relevant checks and push the playground branch as well.
- Verify the pushed heads. If the backmerge needs a product decision or cannot be validated, report the specific issue and the playground's sync status.
