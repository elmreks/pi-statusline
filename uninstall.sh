#!/usr/bin/env bash
set -euo pipefail

PI_AGENT_DIR="${HOME}/.pi/agent"
EXTENSION_TARGET="${PI_AGENT_DIR}/extensions/chaos-footer.ts"
BLURT_TARGET="${PI_AGENT_DIR}/bot-blurts.txt"

remove_if_present() {
  local path="$1"
  if [ -L "$path" ] || [ -e "$path" ]; then
    rm -f "$path"
    printf 'Removed %s\n' "$path"
  else
    printf 'Not present %s\n' "$path"
  fi
}

remove_if_present "$EXTENSION_TARGET"
remove_if_present "$BLURT_TARGET"

printf '\nRun /reload in pi.\n'
