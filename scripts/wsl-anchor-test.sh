#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

anchor test --skip-build --provider.cluster localnet
