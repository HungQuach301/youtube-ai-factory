#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

command -v timeout >/dev/null || {
  echo "build-verified.sh requires GNU timeout." >&2
  exit 69
}

vinext="${SITES_PROJECT_ROOT}/node_modules/.bin/vinext"
if [[ ! -x "${vinext}" ]]; then
  echo "vinext is unavailable. Run npm run install:ci and wait for it to finish before building." >&2
  exit 69
fi

echo "Checking asynchronous API error boundaries..."
node "${script_dir}/check-async-error-boundaries.mjs"

echo "Checking commercial UI static contract..."
node "${script_dir}/check-commercial-ui.mjs"

echo "Checking canonical-data primary projections..."
node --import tsx "${script_dir}/check-commercial-primary.ts"

echo "Checking Intelligence & Niche executable contract..."
node --import tsx "${script_dir}/check-intelligence-niche-contract.ts"

echo "Checking Niche Opportunity Portfolio V2 contract..."
node --import tsx "${script_dir}/check-niche-opportunity-portfolio-v2.ts"

echo "Checking canonical Channel Strategy bootstrap contract..."
node --import tsx "${script_dir}/check-canonical-channel-strategy-bootstrap.ts"

echo "Checking Content System & Planning executable contract..."
node --import tsx "${script_dir}/check-content-system-planning.ts"

echo "Checking Production Engine V2 legacy dependency firewall..."
node "${script_dir}/check-production-v2-firewall.mjs"

echo "Checking sequential production runtime contract..."
node --test "${SITES_PROJECT_ROOT}/tests/sequential-production-control.test.mjs" "${SITES_PROJECT_ROOT}/tests/sequential-production-runtime.test.mjs"

echo "Running bounded vinext build..."
timeout \
  --signal=TERM \
  --kill-after="${SITES_BUILD_KILL_AFTER:-10s}" \
  "${SITES_BUILD_TIMEOUT:-3m}" \
  "${vinext}" build

"${script_dir}/validate-artifact.sh"

echo "Checking rendered commercial journeys..."
node "${script_dir}/check-commercial-rendered.mjs"

echo "Checking commercial client performance budgets..."
node "${script_dir}/check-commercial-performance.mjs"
