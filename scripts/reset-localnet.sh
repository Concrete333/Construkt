#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROGRAM_SO="$REPO_ROOT/target/deploy/construkt.so"
PROGRAM_KEYPAIR="$REPO_ROOT/target/deploy/construkt-keypair.json"
PROGRAM_ID="34V8k3GGFE1wZS3bghFvazcVyyDBErFPs5xRFqTpnZCL"
LEDGER_DIR="$REPO_ROOT/test-ledger"
VALIDATOR_LOG="$LEDGER_DIR/validator.log"
RPC_URL="http://127.0.0.1:8899"

# Demo wallet keypairs (deterministic seeds from mockSeed.ts)
FINANCE_KEY="AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9"
PM_KEY="9hSR6S7WPtxmTojgo6GG3k4yDPecgJY292j7xrsUGWBu"
DIRECTOR_KEY="GyGKxMyg1p9SsHfm15MkNUu1u9TN2JtTspcdmrtGUdse"
CONTRACTOR_KEY="EdmxWPmx2WH6WgFfTdu9xfkYf3k1g5wD1zccTVySEEh1"

wait_for_validator() {
  for _ in $(seq 1 30); do
    if solana --url "$RPC_URL" cluster-version >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

airdrop_with_retry() {
  local key="$1"
  for _ in $(seq 1 5); do
    if solana airdrop --url "$RPC_URL" 10 "$key" >/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

require_command() {
  local name="$1"
  local help_text="$2"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "ERROR: $name not found. $help_text"
    exit 1
  fi
}

stop_existing_validator() {
  local pids
  pids="$(
    pgrep -fa 'solana-test-validator' \
      | grep -F -- "--ledger $LEDGER_DIR" \
      | awk '{print $1}' \
      || true
  )"
  if [ -z "$pids" ]; then
    return 0
  fi

  echo "==> Stopping existing solana-test-validator process(es)..."
  kill $pids 2>/dev/null || true
  sleep 2

  pids="$(
    pgrep -fa 'solana-test-validator' \
      | grep -F -- "--ledger $LEDGER_DIR" \
      | awk '{print $1}' \
      || true
  )"
  if [ -n "$pids" ]; then
    echo "    Some validator processes are still running; forcing shutdown."
    kill -9 $pids 2>/dev/null || true
    sleep 1
  fi
}

echo "==> Checking toolchain..."
require_command solana "Install Solana CLI in WSL first."
require_command solana-test-validator "Install Solana CLI in WSL first."
require_command anchor "Install Anchor CLI in WSL first."
require_command npm "Install Node.js and npm in WSL first."
require_command node "Install Node.js in WSL first."

echo "==> Checking repo dependencies..."
if [ ! -d "$REPO_ROOT/node_modules" ]; then
  echo "ERROR: node_modules is missing. Run 'npm install' from $REPO_ROOT first."
  exit 1
fi

echo "==> Building Anchor program..."
(
  cd "$REPO_ROOT"
  anchor build
)

if [ ! -f "$PROGRAM_SO" ]; then
  echo "ERROR: $PROGRAM_SO not found after build."
  exit 1
fi

if [ ! -f "$PROGRAM_KEYPAIR" ]; then
  echo "ERROR: $PROGRAM_KEYPAIR not found after build."
  exit 1
fi

echo "==> Syncing app-facing IDL..."
(
  cd "$REPO_ROOT"
  npm run idl:sync
)

echo "==> Resetting validator ledger..."
stop_existing_validator

case "$LEDGER_DIR" in
  "$REPO_ROOT"/*) ;;
  *)
    echo "ERROR: Refusing to touch ledger outside repo root: $LEDGER_DIR"
    exit 1
    ;;
esac

rm -rf "$LEDGER_DIR"
mkdir -p "$LEDGER_DIR"

echo "==> Starting solana-test-validator..."
VALIDATOR_PID=""
trap 'rc=$?; if [ "$rc" -ne 0 ] && [ -n "$VALIDATOR_PID" ]; then kill "$VALIDATOR_PID" 2>/dev/null || true; fi' EXIT
nohup solana-test-validator \
  --ledger "$LEDGER_DIR" \
  --bpf-program "$PROGRAM_ID" "$PROGRAM_SO" \
  --reset \
  --quiet \
  >"$VALIDATOR_LOG" 2>&1 &
VALIDATOR_PID="$!"

echo "    Ledger:  $LEDGER_DIR"
echo "    Log:     $VALIDATOR_LOG"

echo "==> Waiting for validator..."
if ! wait_for_validator; then
  echo "ERROR: Validator did not become ready in time. Check $VALIDATOR_LOG."
  exit 1
fi

echo "==> Airdropping SOL to demo wallets..."
for KEY in "$FINANCE_KEY" "$PM_KEY" "$DIRECTOR_KEY" "$CONTRACTOR_KEY"; do
  if ! airdrop_with_retry "$KEY"; then
    echo "ERROR: Failed to airdrop SOL to $KEY."
    exit 1
  fi
done

echo "==> Seeding localnet demo state..."
(
  cd "$REPO_ROOT"
  npm run seed:localnet
)

echo ""
echo "Localnet reset complete."
echo "  RPC:        $RPC_URL"
echo "  Program ID: $PROGRAM_ID"
echo "  Ledger:     $LEDGER_DIR"
echo "  Log:        $VALIDATOR_LOG"
echo ""
echo "Next:"
echo "  cd $REPO_ROOT/app && VITE_ANCHOR_RPC=$RPC_URL npm run dev"
trap - EXIT
