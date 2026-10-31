# Repository guidance

Before starting repository work, read the current root [Readme.md](Readme.md) to understand the application's architecture, behavior, workflows, and relevant validation guidance. If documentation contradicts the implementation, consult the relevant source code as the ground truth.

- Work on the application by default; exclude the experimental video Studio unless explicitly requested.
- Keep changes focused on the requested task; avoid unrelated refactors.
- Preserve compatibility with older artwork and recipe files, saved profiles, and Undo/Redo behavior.
- Select relevant validation using Readme.md. For UI changes, also run browser checks when available. Report what passed, failed, or was not run, including blockers; do not rely on a fixed test count.
- When behavior changes, update the relevant Readme.md sections instead of appending contradictory notes.
- Preserve existing and concurrent changes. Never merge to main without explicit user approval.
