#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PI_AGENT_DIR="${HOME}/.pi/agent"
EXTENSIONS_DIR="${PI_AGENT_DIR}/extensions"

install_file() {
  local src="$1"
  local dest="$2"
  local dest_dir
  local tmp

  dest_dir="$(dirname "$dest")"
  mkdir -p "$dest_dir"

  if [ -L "$dest" ] || [ -e "$dest" ]; then
    rm -f "$dest"
  fi

  tmp="$(mktemp "${dest}.tmp.XXXXXX")"
  cp "$src" "$tmp"
  mv "$tmp" "$dest"

  printf 'Installed %s\n' "$dest"
}

install_file "${REPO_ROOT}/extensions/chaos-footer.ts" "${EXTENSIONS_DIR}/chaos-footer.ts"
install_file "${REPO_ROOT}/bot-blurts.txt" "${PI_AGENT_DIR}/bot-blurts.txt"

printf '\nRun /reload in pi.\n'
