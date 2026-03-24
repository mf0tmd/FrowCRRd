#!/usr/bin/env bash
set -euo pipefail

BUILD_DIR="${1:-build/gui-release}"
BUILD_TYPE="${2:-Release}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BUILD_DIR_ABS="${REPO_ROOT}/${BUILD_DIR}"

cmake -S "${REPO_ROOT}" -B "${BUILD_DIR_ABS}" -G Ninja -DCMAKE_BUILD_TYPE="${BUILD_TYPE}" -DBUILD_TESTING=OFF
cmake --build "${BUILD_DIR_ABS}" --target frowcrrd_runner -j 8

RUNNER_PATH="${BUILD_DIR_ABS}/bin/frowcrrd_runner"
if [[ -f "${RUNNER_PATH}" ]]; then
  echo "Runner built: ${RUNNER_PATH}"
else
  echo "Build completed, but runner executable was not found at expected path: ${RUNNER_PATH}" >&2
fi
