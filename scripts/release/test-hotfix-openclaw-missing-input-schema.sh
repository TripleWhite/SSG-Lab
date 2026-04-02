#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOTFIX_SCRIPT="${SCRIPT_DIR}/hotfix-openclaw-missing-input-schema.sh"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

openclaw_src="${tmpdir}/openclaw-src"
sdk_dir="${openclaw_src}/node_modules/fake-openclaw/node_modules/@anthropic-ai/sdk/helpers/beta"
mkdir -p "$sdk_dir"

cat >"${sdk_dir}/mcp.mjs" <<'EOF'
export function buildTool(tool) {
    const inputSchema = {
        ...tool.inputSchema,
        type: 'object',
        properties: tool.inputSchema.properties ?? null,
        required: tool.inputSchema.required ?? null,
    };

    return inputSchema;
}
EOF

cat >"${sdk_dir}/mcp.js" <<'EOF'
function buildTool(tool) {
    const inputSchema = {
        ...tool.inputSchema,
        type: 'object',
        properties: tool.inputSchema.properties ?? null,
        required: tool.inputSchema.required ?? null,
    };

    return inputSchema;
}

module.exports = { buildTool };
EOF

first_run_output="$(OPENCLAW_SRC_DIR="$openclaw_src" "$HOTFIX_SCRIPT")"
printf '%s\n' "$first_run_output"

grep -q 'Patched: .*mcp\.mjs' <<<"$first_run_output"
grep -q 'Patched: .*mcp\.js' <<<"$first_run_output"

for helper_path in "${sdk_dir}/mcp.mjs" "${sdk_dir}/mcp.js"; do
  grep -q "const rawInputSchema = tool.inputSchema ?? {};" "$helper_path"
  grep -q "properties: rawInputSchema.properties ?? null," "$helper_path"
  if grep -q "tool.inputSchema.properties" "$helper_path"; then
    echo "expected vulnerable properties access to be removed from $helper_path" >&2
    exit 1
  fi
done

second_run_output="$(OPENCLAW_SRC_DIR="$openclaw_src" "$HOTFIX_SCRIPT")"
printf '%s\n' "$second_run_output"

grep -q 'Already patched: .*mcp\.mjs' <<<"$second_run_output"
grep -q 'Already patched: .*mcp\.js' <<<"$second_run_output"

echo "ok: hotfix patches both mcp.mjs and mcp.js and is idempotent"
