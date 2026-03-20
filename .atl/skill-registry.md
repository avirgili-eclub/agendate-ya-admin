# Skill Registry

**Orchestrator use only.** Read this registry once per session to resolve skill paths, then pass pre-resolved paths directly to each sub-agent's launch prompt. Sub-agents receive the path and load the skill directly. They do not read this registry.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| API/backend/REST/auth/JWT/database/webhook/deploy | backend-api | C:\Users\david\.claude\skills\Backend-API\SKILL.md |
| Flutter/mobile/Riverpod/pubspec/flutter test | flutter-app | C:\Users\david\.claude\skills\Flutter-App\SKILL.md |
| Frontend web/React/Next.js/Svelte/Vite/dashboard/SSR/SEO | frontend-web | C:\Users\david\.claude\skills\Frontend-Web\SKILL.md |
| When writing Go tests, using teatest, or adding test coverage | go-testing | C:\Users\david\.claude\skills\go-testing\SKILL.md |
| Planning/RFC/PRD/spec/scope/requirements/roadmap | product-planning | C:\Users\david\.claude\skills\Product-Planning\SKILL.md |
| Review/security/performance/refactor/quality audit | quality-review | C:\Users\david\.claude\skills\Quality-Review\SKILL.md |
| When user asks to create a new skill, add agent instructions, or document patterns for AI | skill-creator | C:\Users\david\.claude\skills\skill-creator\SKILL.md |
| UI/UX/wireframe/mockup/prototype/design system/look and feel | ui-ux-web | C:\Users\david\.claude\skills\UI-UX-Web\SKILL.md |

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| No project convention files detected | - | Checked: agents.md, AGENTS.md, CLAUDE.md, .cursorrules, GEMINI.md, copilot-instructions.md |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted where available.
