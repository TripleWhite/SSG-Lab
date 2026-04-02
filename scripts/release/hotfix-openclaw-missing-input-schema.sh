#!/usr/bin/env bash
set -euo pipefail

# Hotfix for MIM-520/MIM-534: Guard missing inputSchema in Anthropic SDK MCP helper.
#
# OpenClaw injects built-in tools (read, write, edit, exec) that may lack inputSchema,
# causing mcpTool() to crash with "Cannot read properties of undefined (reading 'properties')".
#
# This script patches BOTH mcp.mjs (ESM) and mcp.js (CJS) variants across ALL copies
# found in node_modules (including pnpm store duplicates).

OPENCLAW_HELPER_PATH="${OPENCLAW_HELPER_PATH:-}"
OPENCLAW_SRC_DIR="${OPENCLAW_SRC_DIR:-}"

# --- Collect all candidate directories where the SDK might live ---
search_roots=()
if [[ -n "$OPENCLAW_SRC_DIR" ]]; then
  search_roots+=("${OPENCLAW_SRC_DIR}/node_modules")
fi
search_roots+=(
  "/home/ubuntu/openclaw-src/node_modules"
  "/home/ec2-user/openclaw-src/node_modules"
  "/home/ubuntu/.npm-global/lib/node_modules/openclaw/node_modules"
  "/home/ec2-user/.npm-global/lib/node_modules/openclaw/node_modules"
)

# --- Discover all mcp.mjs and mcp.js files to patch ---
files_to_patch=()

# If explicit path was given, add it directly
if [[ -n "$OPENCLAW_HELPER_PATH" && -f "$OPENCLAW_HELPER_PATH" ]]; then
  files_to_patch+=("$OPENCLAW_HELPER_PATH")
fi

for root in "${search_roots[@]}"; do
  [[ -d "$root" ]] || continue
  # Find both ESM (.mjs) and CJS (.js) variants, following symlinks (pnpm)
  while IFS= read -r -d '' f; do
    files_to_patch+=("$f")
  done < <(find -L "$root" -path '*/@anthropic-ai/sdk/helpers/beta/mcp.mjs' -print0 \
                            -o -path '*/@anthropic-ai/sdk/helpers/beta/mcp.js'  -print0 2>/dev/null)
done

# Deduplicate by resolved real path. Avoid associative arrays so the script
# still runs under the default macOS Bash 3.2 used in local verification.
unique_reals=()
unique_files=()
for f in "${files_to_patch[@]}"; do
  real="$(readlink -f "$f" 2>/dev/null || realpath "$f" 2>/dev/null || echo "$f")"
  duplicate=0
  if ((${#unique_reals[@]} > 0)); then
    for existing_real in "${unique_reals[@]}"; do
      if [[ "$existing_real" == "$real" ]]; then
        duplicate=1
        break
      fi
    done
  fi

  if [[ $duplicate -eq 0 ]]; then
    unique_reals+=("$real")
    unique_files+=("$f")
  fi
done

if [[ ${#unique_files[@]} -eq 0 ]]; then
  echo "OpenClaw MCP helper not found in any known location." >&2
  exit 1
fi

echo "Found ${#unique_files[@]} SDK helper file(s) to patch."

# --- Apply the patch to each file ---
patched=0
for helper_path in "${unique_files[@]}"; do
  python3 - "$helper_path" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()

new = """    const rawInputSchema = tool.inputSchema ?? {};
    const inputSchema = {
        ...rawInputSchema,
        type: 'object',
        properties: rawInputSchema.properties ?? null,
        required: rawInputSchema.required ?? null,
    };"""

old = """    const inputSchema = {
        ...tool.inputSchema,
        type: 'object',
        properties: tool.inputSchema.properties ?? null,
        required: tool.inputSchema.required ?? null,
    };"""

if new in text:
    print(f"Already patched: {path}")
    raise SystemExit(0)

if old not in text:
    print(f"WARNING: target snippet not found in {path} — skipping", file=sys.stderr)
    raise SystemExit(0)

backup_dir = path.parent / ".mim520-backups"
backup_dir.mkdir(exist_ok=True)
backup_path = backup_dir / f"{path.name}.pre-mim520.bak"
if not backup_path.exists():
    backup_path.write_text(text)

path.write_text(text.replace(old, new, 1))
print(f"Patched: {path}")
print(f"Backup: {backup_path}")
PY

  # Validate patched file with node syntax check
  node --check "$helper_path" >/dev/null
  patched=$((patched + 1))
done

echo "Done. Processed ${patched} file(s)."
