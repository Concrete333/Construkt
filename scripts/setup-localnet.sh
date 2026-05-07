#!/usr/bin/env bash
set -euo pipefail

# Non-login shells (e.g., `bash scripts/...`) may not load profile PATH updates.
# Include common Solana install path explicitly so CLI discovery is stable.
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROGRAM_SO="$REPO_ROOT/target/deploy/construkt.so"
PROGRAM_ID="34V8k3GGFE1wZS3bghFvazcVyyDBErFPs5xRFqTpnZCL"

# Demo wallet keypairs (deterministic seeds from mockSeed.ts)
FINANCE_KEY="AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9"    # fill(1)
PM_KEY="9hSR6S7WPtxmTojgo6GG3k4yDPecgJY292j7xrsUGWBu"         # fill(2)
DIRECTOR_KEY="GyGKxMyg1p9SsHfm15MkNUu1u9TN2JtTspcdmrtGUdse"   # fill(3)
CONTRACTOR_KEY="EdmxWPmx2WH6WgFfTdu9xfkYf3k1g5wD1zccTVySEEh1"  # fill(4)

wait_for_validator() {
  for _ in $(seq 1 30); do
    if solana cluster-version >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

airdrop_with_retry() {
  local key="$1"
  for _ in $(seq 1 5); do
    if solana airdrop 10 "$key"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

echo "==> Checking toolchain..."
if ! command -v solana >/dev/null 2>&1; then
  echo "ERROR: Solana CLI not found. Install Solana CLI in WSL first."
  exit 1
fi

if ! command -v solana-test-validator >/dev/null 2>&1; then
  echo "ERROR: solana-test-validator not found. Install Solana CLI in WSL first."
  exit 1
fi

echo "==> Checking for built program..."
if [ ! -f "$PROGRAM_SO" ]; then
  echo "ERROR: $PROGRAM_SO not found. Run 'anchor build' in WSL first."
  exit 1
fi

echo "==> Starting solana-test-validator..."
solana-test-validator \
  --bpf-program "$PROGRAM_ID" "$PROGRAM_SO" \
  --reset \
  --quiet &
VALIDATOR_PID=$!
trap 'kill "$VALIDATOR_PID" 2>/dev/null || true' EXIT
echo "    Validator PID: $VALIDATOR_PID"

echo "==> Waiting for validator..."
if ! wait_for_validator; then
  echo "ERROR: Validator did not become ready in time."
  exit 1
fi
solana config set --url http://localhost:8899

echo "==> Airdropping SOL to demo wallets..."
for KEY in "$FINANCE_KEY" "$PM_KEY" "$DIRECTOR_KEY" "$CONTRACTOR_KEY"; do
  if ! airdrop_with_retry "$KEY"; then
    echo "ERROR: Failed to airdrop SOL to $KEY."
    exit 1
  fi
done

echo ""
echo "Localnet ready."
echo "  RPC:        http://localhost:8899"
echo "  Program ID: $PROGRAM_ID"
echo ""
echo "Next: run the seed script from repo root:"
echo "  cd $REPO_ROOT && npx ts-node scripts/seed-localnet.ts"
echo ""
echo "Then start the frontend in anchor mode:"
echo "  cd $REPO_ROOT/app && VITE_ANCHOR_RPC=http://localhost:8899 npm run dev"
