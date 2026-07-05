#!/usr/bin/env bash
#
# opencatalog.sh — review-pr.sh
#
# Runs the full submission review pipeline locally:
#   1. Fetch latest from origin
#   2. Checkout the PR branch
#   3. validate:staging
#   4. enrich (probe URLs, fetch GitHub stats)
#   5. promote (move candidate to curated/)
#   6. validate (curated records)
#   7. build (Next.js)
#   8. test (unit tests)
#   9. Squash-merge the PR to main
#  10. Delete the local + remote branch
#  11. Return to main
#
# Every step is logged to review-pr.log (next to this script).
# On any failure, the script stops gracefully and reports which step failed.
#
# Usage:
#   ./scripts/review-pr.sh <PR-NUMBER>           # review and merge PR #N
#   ./scripts/review-pr.sh <PR-NUMBER> --no-merge # run pipeline without merging
#   ./scripts/review-pr.sh <PR-NUMBER> --force    # promote with --force flag
#
# Requires: gh CLI, bun, git
#

set -euo pipefail

# ─── Setup ─────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/review-pr.log"

# cd to repo root so bun test, git, etc. resolve from the right place
cd "$(git rev-parse --show-toplevel)"

# Truncate log at start of each run
echo "=== review-pr.sh — $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" > "$LOG_FILE"

log() {
  echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG_FILE"
}

fail() {
  log "✗ FAILED at step: $1"
  log "  Error: $2"
  log ""
  log "To resume after fixing:"
  log "  1. Fix the issue described above"
  log "  2. Re-run: $0 $PR_NUMBER ${EXTRA_ARGS[*]:-}"
  log ""
  log "Current branch: $(git branch --show-current)"
  log "You are still on the PR branch. Fix the issue and re-run,"
  log "or return to main with: git checkout main"
  exit 1
}

step() {
  local num="$1"
  local name="$2"
  shift 2
  log ""
  log "── Step $num: $name ──"
  log "  running: $*"
  if ! "$@" >>"$LOG_FILE" 2>&1; then
    fail "$name" "Command failed: $*"
  fi
  log "  ✓ passed"
}

# ─── Args ──────────────────────────────────────────────────────────────────

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <PR-NUMBER> [--no-merge] [--force]"
  echo ""
  echo "  PR-NUMBER   The GitHub PR number to review"
  echo "  --no-merge  Run pipeline without merging the PR"
  echo "  --force     Pass --force to promote (skip readiness check)"
  exit 1
fi

PR_NUMBER="$1"
shift
EXTRA_ARGS=()
NO_MERGE=false
PROMOTE_FORCE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-merge) NO_MERGE=true; EXTRA_ARGS+=("--no-merge") ;;
    --force)    PROMOTE_FORCE="--force"; EXTRA_ARGS+=("--force") ;;
    *)          EXTRA_ARGS+=("$1") ;;
  esac
  shift
done

# ─── Pre-flight checks ─────────────────────────────────────────────────────

log "Pre-flight checks..."

command -v gh >/dev/null 2>&1 || fail "pre-flight" "gh CLI not installed"
command -v bun >/dev/null 2>&1 || fail "pre-flight" "bun not installed"
command -v git >/dev/null 2>&1 || fail "pre-flight" "git not installed"

# Verify we're in a git repo
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "pre-flight" "Not in a git repo"

# Verify PR exists and is open
PR_INFO=$(gh pr view "$PR_NUMBER" --json number,state,headRefName,title 2>&1) || fail "pre-flight" "PR #$PR_NUMBER not found"
PR_STATE=$(echo "$PR_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin)['state'])")
PR_BRANCH=$(echo "$PR_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin)['headRefName'])")
PR_TITLE=$(echo "$PR_INFO" | python3 -c "import sys,json; print(json.load(sys.stdin)['title'])")

log "  PR #$PR_NUMBER: $PR_TITLE"
log "  State: $PR_STATE"
log "  Branch: $PR_BRANCH"

if [[ "$PR_STATE" != "OPEN" ]]; then
  fail "pre-flight" "PR #$PR_NUMBER is not OPEN (state: $PR_STATE)"
fi

if [[ -z "$PR_BRANCH" || "$PR_BRANCH" == "null" ]]; then
  fail "pre-flight" "Could not determine PR branch name"
fi

log "  ✓ all pre-flight checks passed"

# ─── Step 1: Fetch ─────────────────────────────────────────────────────────

step 1 "fetch origin" git fetch origin --prune

# ─── Step 2: Checkout PR branch ────────────────────────────────────────────

log ""
log "── Step 2: checkout PR branch ──"

# Stash any uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
  log "  stashing uncommitted changes..."
  git stash push -m "review-pr.sh auto-stash $(date -u +%Y%m%d%H%M%S)" >>"$LOG_FILE" 2>&1 || fail "checkout" "Could not stash changes"
fi

# Checkout the PR branch
if ! git checkout "$PR_BRANCH" >>"$LOG_FILE" 2>&1; then
  # Branch doesn't exist locally, try tracking remote
  if ! git checkout -b "$PR_BRANCH" "origin/$PR_BRANCH" >>"$LOG_FILE" 2>&1; then
    fail "checkout" "Could not checkout branch $PR_BRANCH"
  fi
fi

# Pull latest
git pull origin "$PR_BRANCH" >>"$LOG_FILE" 2>&1 || true
log "  ✓ on branch $PR_BRANCH"

# ─── Step 3: validate:staging ──────────────────────────────────────────────

step 3 "validate:staging" bun run validate:staging

# ─── Step 4: enrich ────────────────────────────────────────────────────────

step 4 "enrich (probe URLs, fetch stats)" bun run enrich

# ─── Step 5: promote ───────────────────────────────────────────────────────

log ""
log "── Step 5: promote ──"
if [[ -n "$PROMOTE_FORCE" ]]; then
  log "  running: bun run promote -- --force"
  if ! bun run scripts/promote.ts --force >>"$LOG_FILE" 2>&1; then
    fail "promote" "promote --force failed"
  fi
else
  if ! bun run promote >>"$LOG_FILE" 2>&1; then
    fail "promote" "promote failed (try --force if sources aren't grounded yet)"
  fi
fi
log "  ✓ promoted"

# ─── Step 6: validate curated ──────────────────────────────────────────────

step 6 "validate curated" bun run validate

# ─── Step 7: build ─────────────────────────────────────────────────────────

step 7 "build" bun run build

# ─── Step 8: unit tests ────────────────────────────────────────────────────

step 8 "unit tests" bun test tests/schema.test.ts

# ─── Done with pipeline ────────────────────────────────────────────────────

log ""
log "✓ All pipeline steps passed!"
log "  validate:staging  ✓"
log "  enrich             ✓"
log "  promote            ✓"
log "  validate           ✓"
log "  build              ✓"
log "  tests              ✓"

# ─── Step 9: Commit promoted changes ───────────────────────────────────────

log ""
log "── Step 9: commit promoted changes ──"

# Check if there are changes to commit (promote moves files from staging to curated)
if git diff --quiet && git diff --cached --quiet; then
  log "  no changes to commit (candidate was already promoted)"
else
  git add -A >>"$LOG_FILE" 2>&1 || fail "commit" "git add failed"
  git commit -m "Promote candidate from PR #$PR_NUMBER

Pipeline: validate:staging → enrich → promote → validate → build → test
All steps passed.

Generated by review-pr.sh

Co-Authored-By: Devin <158243242+devin-ai-integration[bot]@users.noreply.github.com>" >>"$LOG_FILE" 2>&1 || fail "commit" "git commit failed"
  git push >>"$LOG_FILE" 2>&1 || fail "commit" "git push failed"
  log "  ✓ committed and pushed"
fi

# ─── Step 10: Merge PR (optional) ──────────────────────────────────────────

if [[ "$NO_MERGE" == "true" ]]; then
  log ""
  log "── Skipping merge (--no-merge) ──"
  log ""
  log "Pipeline complete. PR #$PR_NUMBER is ready to merge."
  log "  Branch: $PR_BRANCH"
  log "  To merge manually: gh pr merge $PR_NUMBER --squash --delete-branch"
  log "  Log file: $LOG_FILE"
  git checkout main >>"$LOG_FILE" 2>&1 || true
  exit 0
fi

log ""
log "── Step 10: squash-merge PR ──"

# Retry the merge — GitHub can return "Head branch is out of date" for a few
# seconds after a push lands, even when the branch is actually current.
MERGE_OK=false
for attempt in 1 2 3 4 5; do
  if gh pr merge "$PR_NUMBER" --squash --delete-branch >>"$LOG_FILE" 2>&1; then
    MERGE_OK=true
    break
  fi
  if [[ $attempt -lt 5 ]]; then
    log "  merge attempt $attempt failed, retrying in ${attempt}0s..."
    sleep $((attempt * 10))
  fi
done

if [[ "$MERGE_OK" != "true" ]]; then
  fail "merge" "gh pr merge failed after 5 attempts (see log for details)"
fi

log "  ✓ PR #$PR_NUMBER merged"

# ─── Step 11: Return to main and clean up ──────────────────────────────────

log ""
log "── Step 11: return to main and clean up ──"

git checkout main >>"$LOG_FILE" 2>&1 || fail "cleanup" "could not checkout main"
git pull origin main >>"$LOG_FILE" 2>&1 || fail "cleanup" "could not pull main"
git remote prune origin >>"$LOG_FILE" 2>&1 || true

# Delete local branch if it still exists
if git show-ref --verify --quiet "refs/heads/$PR_BRANCH" 2>/dev/null; then
  git branch -D "$PR_BRANCH" >>"$LOG_FILE" 2>&1 || true
  log "  ✓ deleted local branch $PR_BRANCH"
fi

log "  ✓ on main, up to date"

# ─── Done ──────────────────────────────────────────────────────────────────

log ""
log "========================================"
log "✅ PR #$PR_NUMBER fully merged and deployed"
log "   Vercel will auto-deploy shortly."
log "   Check: https://opencatalog.sh"
log "   Log:   $LOG_FILE"
log "========================================"
