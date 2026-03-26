---
name: frontend-worker
description: Implements frontend changes — Astro pages, CSS, JavaScript, email templates
---

# Frontend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features that involve:

- Astro page changes (HTML, frontmatter, inline scripts, scoped styles)
- CSS custom property updates and style changes
- JavaScript interaction/animation modifications
- Email template redesign (inline CSS HTML generation)
- Time/date formatting fixes

## Required Skills

- **agent-browser**: MUST invoke for visual verification of any landing page changes. Use to navigate to `http://localhost:4321`, take screenshots, test interactions (mouse movement over poster, opening info modal, checking button states).

## Work Procedure

### 1. Understand the Feature

Read the feature description, preconditions, expectedBehavior, and verificationSteps thoroughly. Then read the relevant source files listed in `.factory/library/architecture.md`.

### 2. Write Tests First (where applicable)

For features with testable logic (e.g., timezone formatting, email template output):

- Write unit tests that assert the expected behavior BEFORE implementing
- Run tests to confirm they fail (red)
- If no test infrastructure exists for this type of code, document in handoff

For purely visual/CSS changes, skip to step 3 but be extra thorough with manual verification in step 5.

### 3. Implement the Changes

Make the code changes. Key conventions:

- **CSS**: Use CSS custom properties where they exist. Hardcoded values only where scoped styles require it.
- **Colors**: The standardized dark is `#1a1816`, the light is `#f5f3f0`. rgba equivalent: `rgba(26, 24, 22, ...)`.
- **Astro pages**: Changes are inline in `.astro` files (HTML template, `<script>` block, `<style>` block).
- **Email templates**: Must use inline CSS only (no external stylesheets). Use `<table>` layout for email client compatibility.
- **No new dependencies**: Do not add npm packages.
- **No `any` types**: Use proper TypeScript types.

### 4. Run Build Verification

```bash
pnpm build
```

This MUST exit 0. Fix any TypeScript errors before proceeding.

### 5. Visual Verification with agent-browser

For any feature that touches the landing page or visual output:

1. Start the dev server: check if it's already running on port 4321, if not start it
2. Invoke the `agent-browser` skill
3. Navigate to `http://localhost:4321`
4. Take a screenshot and verify the changes visually
5. For interaction features (poster tilt): move the mouse across the flyer card area, observe the response
6. For the info modal: click the "info" button, verify time and colors
7. Test at 390px viewport width for mobile
8. Check browser console for JavaScript errors

For email template features:

- The templates are TypeScript functions. Verify by reading the generated HTML structure.
- Confirm all required fields are present and colors match the spec.

### 6. Targeted Grep Verification

Run targeted grep commands to verify implementation:

- `rg '#231e19' src/` should return zero results (after color changes)
- `rg '#0a0a0a' src/` should return zero results (after color changes)
- `rg 'countdown' src/` should return zero results (after countdown removal)
- `rg 'toLocaleTimeString' src/` should show timeZone in every call (after timezone fix)

### 7. Commit

Stage and commit all changes with a descriptive message.

## Example Handoff

```json
{
  "salientSummary": "Standardized dark color to #1a1816 across global.css (--color-fg, .dark-ctx), Base.astro (theme-color), and index.astro (footer, buttons, modal). Removed countdown timer HTML/CSS/JS/GSAP refs. Verified via pnpm build (exit 0), agent-browser screenshots at 390px and 768px, and grep confirms zero #231e19/#0a0a0a/countdown references remain.",
  "whatWasImplemented": "Updated 3 CSS custom properties in global.css, replaced 7 hardcoded #231e19 instances and 3 rgba(35,30,25) instances in index.astro with #1a1816 equivalents, changed meta theme-color in Base.astro, and fully removed countdown timer (HTML template, CSS rules, JS timer/interval/cleanup, GSAP animation reference).",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "pnpm build", "exitCode": 0, "observation": "Build succeeded, zero TS errors" },
      {
        "command": "rg '#231e19' src/",
        "exitCode": 1,
        "observation": "Zero matches — all instances replaced"
      },
      {
        "command": "rg '#0a0a0a' src/",
        "exitCode": 1,
        "observation": "Zero matches — all instances replaced"
      },
      {
        "command": "rg 'countdown' src/",
        "exitCode": 1,
        "observation": "Zero matches — fully removed"
      }
    ],
    "interactiveChecks": [
      {
        "action": "Opened http://localhost:4321 in agent-browser at 390px width",
        "observed": "Landing page loads: flyer card visible, no countdown timer, footer dark bar with consistent #1a1816 tone, action buttons with matching dark text/border"
      },
      {
        "action": "Opened http://localhost:4321 in agent-browser at 768px width",
        "observed": "Desktop layout: same color consistency, no countdown, balanced spacing between flyer and buttons"
      },
      { "action": "Checked browser console", "observed": "Zero JavaScript errors on page load" }
    ]
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Feature depends on a shared constant or utility that doesn't exist yet and is listed as a precondition
- The dev server fails to start or Supabase returns errors preventing page load
- A visual change looks wrong but the spec is ambiguous
- The RSVP API route structure is different than expected, blocking email template data flow
- Build fails due to errors in files outside this feature's scope
