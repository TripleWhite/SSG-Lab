#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="${SCRIPT_DIR}/bootstrap-openclaw-host.sh"

assert_default_remote_user() {
  if ! grep -Fq 'REMOTE_USER="${REMOTE_USER:-ubuntu}"' "$SCRIPT_PATH"; then
    echo "expected bootstrap-openclaw-host.sh to default REMOTE_USER to ubuntu" >&2
    exit 1
  fi

  if ! grep -Fq 'REMOTE_HOME="${REMOTE_HOME:-/home/${REMOTE_USER}}"' "$SCRIPT_PATH"; then
    echo "expected bootstrap-openclaw-host.sh to derive REMOTE_HOME from REMOTE_USER" >&2
    exit 1
  fi
}

extract_function() {
  local function_name="$1"

  awk -v fn="$function_name" '
    $0 == fn "() {" { in_fn = 1 }
    in_fn { print }
    in_fn && $0 == "}" { exit }
  ' "$SCRIPT_PATH"
}

eval "$(extract_function install_openclaw_source)"

ensure_pnpm() { :; }
pnpm() { :; }

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

origin_repo="${tmpdir}/origin"
checkout_dir="${tmpdir}/checkout"

git init -q "$origin_repo"
git -C "$origin_repo" config user.name qa
git -C "$origin_repo" config user.email qa@example.com
git -C "$origin_repo" branch -m main

echo "first" > "${origin_repo}/README.md"
git -C "$origin_repo" add README.md
git -C "$origin_repo" commit -q -m "first"
first_sha="$(git -C "$origin_repo" rev-parse HEAD)"
git -C "$origin_repo" branch pinned-branch "$first_sha"

echo "second" > "${origin_repo}/README.md"
git -C "$origin_repo" commit -qam "second"
second_sha="$(git -C "$origin_repo" rev-parse HEAD)"

assert_ref_checkout() {
  local ref="$1"
  local expected_sha="$2"

  rm -rf "$checkout_dir"
  OPENCLAW_REPO_URL="file://${origin_repo}"
  OPENCLAW_REPO_REF="$ref"
  OPENCLAW_SRC_DIR="$checkout_dir"
  install_openclaw_source >/dev/null

  actual_sha="$(git -C "$checkout_dir" rev-parse HEAD)"
  if [[ "$actual_sha" != "$expected_sha" ]]; then
    echo "expected $ref to resolve to $expected_sha, got $actual_sha" >&2
    exit 1
  fi
}

assert_default_remote_user
assert_ref_checkout "pinned-branch" "$first_sha"
assert_ref_checkout "$second_sha" "$second_sha"

echo "ok: bootstrap-openclaw-host defaults to ubuntu and install_openclaw_source handles branch and commit SHA refs"
