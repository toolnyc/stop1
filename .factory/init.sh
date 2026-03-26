#!/usr/bin/env bash
set -euo pipefail

cd /Users/pete/Code/clubstack-events/stop1

# Install dependencies (idempotent)
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Ensure .env.local exists
if [ ! -f .env.local ]; then
  echo "WARNING: .env.local not found. Copy from .env.example and fill in values."
fi

# Kill any stale dev server on port 4321
lsof -ti :4321 | xargs kill 2>/dev/null || true
