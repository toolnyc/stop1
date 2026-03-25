# Stop One

> **Primary instruction source:** [AGENTS.md](./AGENTS.md)
>
> This file is the Claude Code entry point. All instructions, conventions, and skills are documented in AGENTS.md for multi-model compatibility.

Recurring DIY party series platform. RSVP pages, door check-in app, and P&L budget tracker per event.

---

**Read [AGENTS.md](./AGENTS.md) for the full instruction set including:**
- Tech stack details
- Commands
- Environment variables
- Architecture conventions
- Skills/procedures (Issue Grinder)
- Quick rules

## Commands

```bash
pnpm dev          # Start dev server (port 4321)
pnpm build        # Production build — must pass zero TS errors
pnpm preview      # Preview production build locally
pnpm db:types     # Regenerate src/types/database.ts from Supabase schema
pnpm db:push      # Push migrations (supabase db push)
pnpm db:new <n>   # Create migration (supabase migration new <n>)
```
