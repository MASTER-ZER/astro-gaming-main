#!/bin/bash
# Auto-commit and push changes every 60 seconds
# Run this in the background

REPO_DIR="/c/Users/eyad/Desktop/Astro-gaming-main"
INTERVAL=60

cd "$REPO_DIR"

while true; do
  if [[ -n $(git status --porcelain) ]]; then
    git add -A
    git commit -m "Auto-update: $(date '+%Y-%m-%d %H:%M:%S')" || true
    git push origin main 2>&1 | tail -5
  fi
  sleep "$INTERVAL"
done
