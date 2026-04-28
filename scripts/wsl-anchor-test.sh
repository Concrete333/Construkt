#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

anchor test --provider.cluster localnet
