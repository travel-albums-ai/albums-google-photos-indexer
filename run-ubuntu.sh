#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
exec ./server --config server-config.json
