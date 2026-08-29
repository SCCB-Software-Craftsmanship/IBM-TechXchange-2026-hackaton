#!/usr/bin/env bash
# install-skills.sh
# Copies all skills from SKILLS/ into the global Bob skills directory (~/.bob/skills/).
# Run from the repository root.

set -euo pipefail

SKILLS_SRC="$(cd "$(dirname "$0")/.." && pwd)/SKILLS"
BOB_SKILLS_DIR="${HOME}/.bob/skills"

if [[ ! -d "$SKILLS_SRC" ]]; then
  echo "ERROR: SKILLS directory not found at $SKILLS_SRC" >&2
  exit 1
fi

mkdir -p "$BOB_SKILLS_DIR"

echo "Installing skills from $SKILLS_SRC → $BOB_SKILLS_DIR"
echo ""

for skill_dir in "$SKILLS_SRC"/*/; do
  skill_name="$(basename "$skill_dir")"
  target="$BOB_SKILLS_DIR/$skill_name"

  if [[ -d "$target" ]]; then
    echo "  ↻  $skill_name (updating existing)"
  else
    echo "  ✓  $skill_name (new)"
  fi

  cp -r "$skill_dir" "$BOB_SKILLS_DIR/"
done

echo ""
echo "Done. Open a new Bob conversation to use the installed skills."
