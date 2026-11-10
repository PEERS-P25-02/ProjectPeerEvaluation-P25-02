#!/usr/bin/env bash
set -uo pipefail

fail() {
  printf 'Staging deployment failed: %s\n' "$1" >&2
  exit 1
}

required=(SOURCE_SHA FRONTEND_IMAGE_REF BACKEND_IMAGE_REF RENDER_FRONTEND_DEPLOY_HOOK RENDER_BACKEND_DEPLOY_HOOK RENDER_API_KEY RENDER_FRONTEND_SERVICE_ID RENDER_BACKEND_SERVICE_ID GITHUB_STEP_SUMMARY)
for name in "${required[@]}"; do
  [[ -n "${!name:-}" ]] || fail "required configuration $name is missing"
done

[[ "$SOURCE_SHA" =~ ^[0-9a-f]{40}$ ]] || fail 'SOURCE_SHA must be a 40-character lowercase commit SHA'
frontend_pattern='^ghcr\.io/peers-p25-02/projectpeerevaluation-p25-02-frontend@sha256:[0-9a-f]{64}$'
backend_pattern='^ghcr\.io/peers-p25-02/projectpeerevaluation-p25-02-backend@sha256:[0-9a-f]{64}$'
[[ "$FRONTEND_IMAGE_REF" =~ $frontend_pattern ]] || fail 'frontend image reference is not the expected immutable GHCR image'
[[ "$BACKEND_IMAGE_REF" =~ $backend_pattern ]] || fail 'backend image reference is not the expected immutable GHCR image'
[[ "$RENDER_FRONTEND_SERVICE_ID" =~ ^srv-[A-Za-z0-9]+$ ]] || fail 'frontend service ID must use the Render srv- identifier format'
[[ "$RENDER_BACKEND_SERVICE_ID" =~ ^srv-[A-Za-z0-9]+$ ]] || fail 'backend service ID must use the Render srv- identifier format'

for tool in git curl jq; do
  command -v "$tool" >/dev/null 2>&1 || fail "required command $tool is unavailable"
done

work_dir=$(mktemp -d 2>/dev/null) || fail 'could not create a temporary directory'
backend_id=''
frontend_id=''
backend_status='not started'
frontend_status='not started'
backend_deploy_ref=''
frontend_deploy_ref=''
summary_written=false

write_summary() {
  [[ "$summary_written" == false ]] || return
  {
    printf '### Staging deployment\n\n'
    printf -- '- Source SHA: `%s`\n' "$SOURCE_SHA"
    printf -- '- Backend image: `%s`\n' "$BACKEND_IMAGE_REF"
    printf -- '- Frontend image: `%s`\n' "$FRONTEND_IMAGE_REF"
    printf -- '- Backend service/deploy/status: `%s` / `%s` / `%s`\n' "$RENDER_BACKEND_SERVICE_ID" "${backend_id:-not created}" "$backend_status"
    printf -- '- Frontend service/deploy/status: `%s` / `%s` / `%s`\n' "$RENDER_FRONTEND_SERVICE_ID" "${frontend_id:-not created}" "$frontend_status"
  } >> "$GITHUB_STEP_SUMMARY"
  summary_written=true
}

on_exit() {
  result=$?
  if [[ $result -ne 0 ]]; then
    write_summary
  fi
  rm -rf "$work_dir"
}
trap on_exit EXIT

check_main_tip() {
  local result tip
  result=$(git ls-remote origin refs/heads/main 2>/dev/null)
  [[ $? -eq 0 ]] || fail 'could not verify the current main tip'
  tip=$(awk 'NR == 1 { print $1 }' <<< "$result")
  [[ "$tip" == "$SOURCE_SHA" ]] || fail 'source SHA is no longer the current main tip'
}

trigger_deploy() {
  local label=$1 hook=$2 image_ref=$3 result_file=$4 http_status deploy_id curl_rc jq_rc
  # Suppress curl diagnostics because they can include the secret hook URL.
  http_status=$(curl --silent --show-error --connect-timeout 10 --max-time 30 --output "$result_file" --write-out '%{http_code}' \
    --get --data-urlencode "imgURL=$image_ref" "$hook" 2>/dev/null)
  curl_rc=$?
  [[ $curl_rc -eq 0 ]] || fail "$label deploy hook request failed"
  if [[ "$http_status" != 200 ]]; then
    if [[ "$http_status" == 202 ]]; then
      if [[ "$label" == backend ]]; then backend_status='queued (HTTP 202; inspect)'; else frontend_status='queued (HTTP 202; inspect)'; fi
      fail "$label hook returned 202; deployment may be queued and needs inspection"
    fi
    if [[ "$label" == backend ]]; then backend_status="hook HTTP $http_status"; else frontend_status="hook HTTP $http_status"; fi
    fail "$label hook returned HTTP $http_status"
  fi
  deploy_id=$(jq -er '.deploy.id | strings | select(length > 0)' "$result_file" 2>/dev/null)
  jq_rc=$?
  if [[ $jq_rc -ne 0 ]]; then
    if [[ "$label" == backend ]]; then backend_status='invalid hook response'; else frontend_status='invalid hook response'; fi
    fail "$label hook response did not contain deploy.id"
  fi
  [[ "$deploy_id" =~ ^dep-[A-Za-z0-9]+$ ]] || {
    if [[ "$label" == backend ]]; then backend_status='invalid deploy ID'; else frontend_status='invalid deploy ID'; fi
    fail "$label hook returned an invalid deploy ID"
  }
  if [[ "$label" == backend ]]; then backend_id=$deploy_id; else frontend_id=$deploy_id; fi
}

wait_for_live() {
  local label=$1 service_id=$2 deploy_id=$3 expected_ref=$4 result_file=$5
  local timeout=${RENDER_POLL_TIMEOUT_SECONDS:-900} interval=${RENDER_POLL_INTERVAL_SECONDS:-10}
  local deadline=$((SECONDS + timeout)) status image_ref http_status curl_rc jq_rc
  while (( SECONDS <= deadline )); do
    http_status=$(curl --silent --show-error --connect-timeout 10 --max-time 30 --output "$result_file" --write-out '%{http_code}' \
      --header "Authorization: Bearer $RENDER_API_KEY" \
      "https://api.render.com/v1/services/$service_id/deploys/$deploy_id" 2>/dev/null)
    curl_rc=$?
    [[ $curl_rc -eq 0 ]] || fail "$label deploy status request failed"
    [[ "$http_status" == 200 ]] || fail "$label deploy status API returned HTTP $http_status"
    status=$(jq -er '.status | strings' "$result_file" 2>/dev/null)
    jq_rc=$?
    [[ $jq_rc -eq 0 ]] || fail "$label deploy status response was invalid"
    image_ref=$(jq -r '.image.ref // empty' "$result_file" 2>/dev/null) || image_ref=''
    case "$status" in
      live)
        if [[ "$image_ref" != "$expected_ref" ]]; then
          if [[ "$label" == backend ]]; then backend_status='live (image mismatch)'; backend_deploy_ref=$image_ref; else frontend_status='live (image mismatch)'; frontend_deploy_ref=$image_ref; fi
          fail "$label reached live with an unexpected image reference"
        fi
        if [[ "$label" == backend ]]; then backend_status=live; backend_deploy_ref=$image_ref; else frontend_status=live; frontend_deploy_ref=$image_ref; fi
        return 0
        ;;
      build_failed|update_failed|pre_deploy_failed|canceled|deactivated)
        if [[ "$label" == backend ]]; then backend_status=$status; else frontend_status=$status; fi
        fail "$label deploy reached terminal status $status"
        ;;
    esac
    if [[ "$label" == backend ]]; then backend_status=$status; else frontend_status=$status; fi
    sleep "$interval"
  done
  if [[ "$label" == backend ]]; then backend_status='timeout'; else frontend_status='timeout'; fi
  fail "$label deploy did not reach live before the timeout"
}

check_main_tip
trigger_deploy backend "$RENDER_BACKEND_DEPLOY_HOOK" "$BACKEND_IMAGE_REF" "$work_dir/backend-hook.json"
backend_status='accepted; waiting'
wait_for_live backend "$RENDER_BACKEND_SERVICE_ID" "$backend_id" "$BACKEND_IMAGE_REF" "$work_dir/backend-status.json"

check_main_tip
trigger_deploy frontend "$RENDER_FRONTEND_DEPLOY_HOOK" "$FRONTEND_IMAGE_REF" "$work_dir/frontend-hook.json"
frontend_status='accepted; waiting'
wait_for_live frontend "$RENDER_FRONTEND_SERVICE_ID" "$frontend_id" "$FRONTEND_IMAGE_REF" "$work_dir/frontend-status.json"
check_main_tip
write_summary
printf 'Both staging services are live at source %s.\n' "$SOURCE_SHA"
