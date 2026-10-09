# Contributing Guide

Welcome to the OopsScam repository. This guide covers the branch workflow, commit conventions, and pull request process for the TERMINAL LARPERS team.

---

## Team Branches

Each member has a dedicated working branch. **Never push directly to `main`.**

| Branch | Owner |
|---|---|
| `main` | Protected — merged only via pull request |
| `jerome` | Jerome Avecilla |
| `gwyn` | Gwyn Barte |
| `johnrey` | Johnrey Gabon |
| `raizel` | Raizel Sablan |

---

## Workflow

### 1. Always start from an up-to-date branch

Before starting any work, sync your branch with the latest `main`:

```bash
git checkout jerome        # switch to your branch
git fetch origin
git merge origin/main      # pull in the latest from main
```

### 2. Make your changes and commit

Keep commits small and focused on one thing. Use this commit message format:

```
<type>: <short description>

Examples:
feat: add OTP detection rule to rules engine
fix: correct score fusion formula off-by-one
chore: update README branch table
docs: add setup instructions to CONTRIBUTING
```

**Types:**
- `feat` — new feature or capability
- `fix` — bug fix
- `chore` — build, config, or tooling change
- `docs` — documentation only
- `refactor` — code restructure with no behavior change
- `test` — adding or updating tests

### 3. Push your branch

```bash
git push origin jerome     # use your own branch name
```

### 4. Open a Pull Request into `main`

- Title: short and descriptive (same format as commit messages)
- Description: what changed, why, and any known limitations
- Tag at least one other team member as a reviewer
- Do not merge your own PR — wait for at least one approval

### 5. After merge

Once your PR is merged into `main`, sync your branch again:

```bash
git checkout jerome
git merge origin/main
```

---

## Hard Rules for the Hackathon

- **Code freeze is October 10, 2026 at 10:00 AM.** No commits after that — judges review the repo as-of the deadline.
- **Do not rewrite history on shared branches.** No `git push --force` on `main`.
- **Do not commit secrets.** No API keys, tokens, or credentials in any file.
- **Disclose everything.** Any model, library, API, or AI tool used must be listed in the submission disclosure.

---

## Code Style

- Language: **TypeScript** throughout
- Formatting: follow the project's Prettier config (`npm run format`)
- Keep components and functions small and focused
- Add a brief comment above any non-obvious logic — especially in the rules engine and scoring fusion

---

## Questions?

Post in the team group chat or raise it directly with a teammate. Given the 24-hour window, keep communication fast and direct.
