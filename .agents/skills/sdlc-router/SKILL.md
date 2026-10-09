---
name: sdlc-router
description: Select available skills for the user's actual software task and SDLC stage, routing mixed requests by subtask without expanding scope. Consult before software work; this skill selects workflows rather than implementing every lifecycle stage.
---

# SDLC routing

1. Identify the prompt's intended deliverable, task type, affected surface, and SDLC stage. Consider the actual project's platform, existing design system, assets, and constraints. Infer from the complete request and context, not isolated keywords. Route mixed tasks by subtask; do not run a whole lifecycle.
2. Use the current session's available skill names, descriptions, and paths as the inventory. Refresh after installation, removal, or edits. If discovery appears stale, inspect frontmatter in supported project `.agents/skills` locations (working directory through repository root), user `~/.agents/skills`, and the environment's exposed system/plugin locations. A cached plugin file or a skill outside discovery roots is not proof that it is active. Respect disabled skills and implicit-invocation policy. Never assume a skill exists from its name or a previous session.
3. Honor explicitly requested skills first within their actual scope. If a requested skill is unavailable, say so and use normal Codex capabilities when possible; do not install it unless requested. Disambiguate same-name skills by path and task fit; do not merge their instructions.
4. Otherwise shortlist installed skills by description. Read the strongest candidate's instructions; when scopes overlap materially, read the strongest competing candidate before deciding. Compare deliverable fit, platform support, existing conventions, constraints, and workflow cost. Choose one primary technical skill by default: the narrowest skill that best fits the task and project. Reading candidates to compare them does not mean applying both. Add another skill only for a distinct necessary subtask. Do not load every candidate, recursively invoke this router, or invent a missing skill.
5. Briefly state the selected skill and why before work. When none fits, state that normal Codex capabilities will handle the task. A communication-style skill can supplement, but cannot replace, the required technical capability.

## Stage selection

Use these capability criteria against the live inventory, not as a fixed skill catalog:

| Requested work | Select a skill whose actual scope covers |
| --- | --- |
| Requirements and planning | Requested requirements elicitation, acceptance criteria, or scoped feature planning; otherwise use normal Codex capabilities |
| Architecture | Design decisions, API/schema planning, or complexity evaluation; refactor/migration workflows only when that transition is requested |
| Implementation | The requested feature/domain; small edits prefer a targeted patch workflow over a broad build workflow |
| Debugging | Investigation for unknown/intermittent causes; targeted bug fixes for established causes |
| Testing | Test authoring for requested tests; validation-only workflows for checking existing work; ordinary capabilities when no matching testing skill exists |
| Review | The requested defect, performance, or security review; visual review uses frontend design guidance |
| Frontend design | UX, accessibility, responsive layout, visual hierarchy, or polish for the requested surface |
| Documentation | The requested document type/domain; prose-style guidance only as a supplement |
| Release | The requested release/package/deployment target; ordinary capabilities if no suitable release skill exists |

## Scope

Preserve explicit choices and existing work. The user's style, stack, accessibility, performance, and scope constraints override skill defaults. Do not add redesigns, animations, refactors, tests, dependencies, commits, pushes, or deployments beyond the request and necessary validation. Skill recommendations do not authorize extra work. Ask only when missing information materially blocks correct work. Keep authorization, local instructions, and execution permissions intact. Finish the requested subtasks and stop.

## Frontend selection

Consider these installed capabilities only while present and enabled in the refreshed inventory. These comparisons supplement dynamic discovery; other newly available skills can win on task fit.

| Candidate | Best fit and boundaries from its installed instructions |
| --- | --- |
| [design-taste-frontend (Taste)](../design-taste-frontend/SKILL.md) | Frontend implementation and visual direction for web landing pages, portfolios, and redesigns. Infers the brief, tunes design variance/motion/density, maps design systems, audits existing brand/content before redesign, and checks the result. Defaults include React/Next.js, Tailwind, and web motion, but they cannot replace the user's stack or authorize dependencies/animations. Explicitly excludes native mobile, dashboards/dense product UI, data tables, multi-step forms, code editors, and realtime collaboration UI. |
| [Upstream Impeccable](../impeccable/SKILL.md) | Focused design, UX, accessibility, responsive, visual review, and polish workflows through its actual commands; also broader new-surface work with product context, incumbent visual evidence, and native-platform references. Choose the command that directly matches the requested operation. |

Prefer Taste when its build and visual-direction workflow best matches the requested web deliverable. Prefer the appropriate Impeccable command when the request is a focused refinement or evaluation. Neither preference is a blanket rule for all frontend work.

For overlapping work such as a redesign, compare the strongest candidates' current instructions against the prompt and existing system: whether the user wants brand-preserving evolution or a replacement visual world, a marketing website or operational/native UI, implementation or evaluation, and which workflow meets the constraints with the least extra work. Select one; never automatically apply both or combine conflicting design directions. If the preserve/replace choice materially blocks correct work and context does not settle it, ask one concise question.

Resolve Taste's path from the live inventory; this repository includes `.agents/skills/design-taste-frontend` so collaborators do not need a user-wide install. Prefer this project copy when both project and user-wide copies are available, unless the user explicitly selects another path; do not load both. Taste is distinct from any architecture/code-quality skill named `taste-skill`, which may not be installed on a collaborator's machine. This project's upstream Impeccable is distinct from any same-name parent-folder skill; prefer the upstream copy for its commands unless the user explicitly selects another path. OopsScam is Android/React Native, so Taste's native-mobile exclusion makes Impeccable's native guidance a better default for its app surfaces. A separate marketing website is evaluated on its own context.

Codex invocation is `$impeccable <command> <target>` (also shown upstream as `/impeccable`), not `/prompts:`. Select only the requested operation: `shape` for UX/UI planning, `critique` for visual/UX review, `audit` for frontend accessibility/quality checks, `adapt` for responsive changes, `layout` for spacing, `typeset` for typography, `clarify` for UX copy, or `polish` for refinement. These are verified installed commands, not an exhaustive or permanent catalog. Use the installed native-platform references where applicable; OopsScam is Android/React Native.

Neither design skill handles general backend bugs, database work, security, test authoring, or release work simply because the project has a frontend. Impeccable's `harden` and `optimize` cover UI concerns only. Installation or skill selection alone must not run `init`, create PRODUCT.md/DESIGN.md, pin shortcuts, redesign the app, enable hook trust, or trigger unrelated lifecycle work. Apply Impeccable's context setup only when performing the selected frontend task; on Windows use its installed `scripts/impeccable.cmd` launcher.
