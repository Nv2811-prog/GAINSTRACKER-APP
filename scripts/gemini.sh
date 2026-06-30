#!/bin/bash
# GainsTracker — launch Gemini CLI using the project API key (no Google login needed).
# Run it with:  npm run gemini
cd "$(dirname "$0")/.." || exit 1
set -a
[ -f .env.local ] && . ./.env.local
set +a
export GEMINI_CLI_TRUST_WORKSPACE=true
exec npx -y @google/gemini-cli "$@"
