#!/bin/bash
set -euo pipefail

if [ -z "${VENICE_API_KEY:-}" ]; then
  echo "Missing VENICE_API_KEY."
  echo "Run: export VENICE_API_KEY=your_venice_key"
  exit 1
fi

curl https://api.venice.ai/api/v1/chat/completions \
  --header "Authorization: Bearer ${VENICE_API_KEY}" \
  --header "Content-Type: application/json" \
  --data '{
    "model": "venice-uncensored",
    "messages": [
      {"role": "user", "content": "Return a JSON object with a score of 95 for a bounty review."}
    ]
  }'
