#!/bin/sh
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

# Clear only this project's built-output QA preview on sandbox revive.
if [ "$(uname -s)" = "Linux" ]; then
  node "$project_dir/scripts/preview.mjs" stop || true
fi

exec node "$project_dir/scripts/dev-server.mjs" "$@"
