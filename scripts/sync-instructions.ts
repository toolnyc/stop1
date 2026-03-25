#!/usr/bin/env npx ts-node
/**
 * Sync instruction entry points
 *
 * Ensures all AI tool entry points exist and reference AGENTS.md correctly.
 * Run with: pnpm sync-instructions
 */

import * as fs from "fs";
import * as path from "path";

const ROOT = process.cwd();

interface EntryPoint {
  file: string;
  content: string;
}

const entryPoints: EntryPoint[] = [
  {
    file: ".github/copilot-instructions.md",
    content: `# Stop One

> **Primary instruction source:** [AGENTS.md](../AGENTS.md)
>
> This file is the GitHub Copilot entry point. All instructions, conventions, and skills are documented in AGENTS.md for multi-model compatibility.

See [AGENTS.md](../AGENTS.md) for the full instruction set.
`,
  },
  {
    file: ".cursorrules",
    content: `# Stop One

Primary instruction source: AGENTS.md

This file is the Cursor IDE entry point. All instructions, conventions, and skills are documented in AGENTS.md for multi-model compatibility.

See AGENTS.md for the full instruction set.
`,
  },
  {
    file: ".windsurfrules",
    content: `# Stop One

Primary instruction source: AGENTS.md

This file is the Windsurf entry point. All instructions, conventions, and skills are documented in AGENTS.md for multi-model compatibility.

See AGENTS.md for the full instruction set.
`,
  },
];

function main(): void {
  console.log("Syncing AI instruction entry points...\n");

  let allGood = true;

  // Check AGENTS.md exists
  const agentsPath = path.join(ROOT, "AGENTS.md");
  if (!fs.existsSync(agentsPath)) {
    console.error("ERROR: AGENTS.md not found at", agentsPath);
    process.exit(1);
  }
  console.log("✓ AGENTS.md exists (primary instruction source)\n");

  // Check CLAUDE.md references AGENTS.md
  const claudePath = path.join(ROOT, "CLAUDE.md");
  if (fs.existsSync(claudePath)) {
    const claudeContent = fs.readFileSync(claudePath, "utf-8");
    if (claudeContent.includes("AGENTS.md")) {
      console.log("✓ CLAUDE.md references AGENTS.md\n");
    } else {
      console.warn("⚠ CLAUDE.md does not reference AGENTS.md");
      allGood = false;
    }
  }

  // Create/update entry points
  for (const entry of entryPoints) {
    const filePath = path.join(ROOT, entry.file);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath, "utf-8");
      if (existing === entry.content) {
        console.log("✓ " + entry.file + " up to date");
      } else {
        fs.writeFileSync(filePath, entry.content);
        console.log("↻ " + entry.file + " updated");
      }
    } else {
      fs.writeFileSync(filePath, entry.content);
      console.log("+ " + entry.file + " created");
    }
  }

  console.log("\n---");
  if (allGood) {
    console.log("All instruction entry points are in sync.");
  } else {
    console.log("Some issues found. Review the warnings above.");
    process.exit(1);
  }
}

main();
