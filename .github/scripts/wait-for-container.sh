#!/usr/bin/env bash
set -euo pipefail

container="${1:?Usage: wait-for-container.sh CONTAINER [TIMEOUT_SECONDS]}"
timeout_seconds="${2:-90}"
if [[ ! "$timeout_seconds" =~ ^[1-9][0-9]*$ ]]; then
  echo 'Timeout must be a positive integer.' >&2
  exit 2
fi

deadline=$((SECONDS + timeout_seconds))
while ((SECONDS < deadline)); do
  if ! state=$(docker inspect --format '{{.State.Status}}' "$container"); then
    echo "Cannot inspect container: $container" >&2
    exit 1
  fi
  health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$container")

  if [[ "$state" == 'running' && "$health" == 'healthy' ]]; then
    echo "$container is healthy."
    exit 0
  fi
  if [[ "$state" != 'running' || "$health" == 'unhealthy' || "$health" == 'missing' ]]; then
    echo "Container $container is not ready: state=$state, health=$health" >&2
    docker inspect --format '{{json .State}}' "$container" || true
    docker logs --tail 100 "$container" || true
    exit 1
  fi
  sleep 1
done

echo "Timed out waiting for $container after ${timeout_seconds}s." >&2
docker inspect --format '{{json .State}}' "$container" || true
docker logs --tail 100 "$container" || true
exit 1
