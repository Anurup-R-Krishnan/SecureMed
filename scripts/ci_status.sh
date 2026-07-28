#!/usr/bin/env bash
set -euo pipefail

REPO=${REPO:-"Anurup-R-Krishnan/SecureMed"}
BRANCH=${1:-"ci-cd-hardening"}
LIMIT=${LIMIT:-10}
SHOW_LOGS=${SHOW_LOGS:-1}

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install GitHub CLI to use this script." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh CLI not authenticated. Run: gh auth login" >&2
  exit 1
fi

echo "Repo: $REPO"
echo "Branch: $BRANCH"
echo "Runs (latest $LIMIT):"

gh run list -R "$REPO" -b "$BRANCH" -L "$LIMIT"

if [ "$SHOW_LOGS" = "1" ]; then
  FAILED_ID=$(gh run list -R "$REPO" -b "$BRANCH" -L "$LIMIT" --json databaseId,conclusion \
    --jq '.[] | select(.conclusion=="failure") | .databaseId' | head -n 1)

  if [ -n "$FAILED_ID" ]; then
    echo ""
    echo "Latest failed run logs (id: $FAILED_ID):"
    gh run view "$FAILED_ID" -R "$REPO" --log-failed
  else
    echo ""
    echo "No failed runs in the latest $LIMIT runs."
  fi
fi
