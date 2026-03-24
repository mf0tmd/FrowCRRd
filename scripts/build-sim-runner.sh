#!/usr/bin/env bash
set -euo pipefail

UNAME_OUT="$(uname -s)"
if [[ "${UNAME_OUT}" != "Linux" ]]; then
  echo "This script must run on Linux (native or WSL). Current platform: ${UNAME_OUT}" >&2
  exit 1
fi

BUILD_DIR="${1:-build/gui-release}"
BUILD_TYPE="${2:-Release}"
