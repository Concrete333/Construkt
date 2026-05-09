#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

if solana --url http://127.0.0.1:8899 cluster-version >/dev/null 2>&1; then
  anchor test --skip-local-validator --skip-deploy --provider.cluster localnet
else
  anchor test --provider.cluster localnet
fi
