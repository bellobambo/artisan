#!/usr/bin/env bash
set -euo pipefail

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "Missing OPENAI_API_KEY."
  echo "Run: export OPENAI_API_KEY=your_openai_key"
  exit 1
fi

curl https://api.openai.com/v1/responses \
  --header "Authorization: Bearer ${OPENAI_API_KEY}" \
  --header "Content-Type: application/json" \
  --data '{
    "model": "gpt-4.1-mini",
    "input": [
      {
        "role": "system",
        "content": "You review learning-community bounty submissions. Return only JSON."
      },
      {
        "role": "user",
        "content": "Review this bounty submission in one paragraph: The learner wrote a beginner guide explaining MetaMask Smart Accounts, ERC-7710, and 1Shot gas abstraction."
      }
    ],
    "text": {
      "format": {
        "type": "json_object"
      }
    }
  }'
