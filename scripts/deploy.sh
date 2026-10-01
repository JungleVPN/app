#!/bin/sh
# Deploys the images already pushed to the registry.
#
# Usage: sh scripts/deploy.sh [compose-file]
#
# Order matters: pull everything and run the migration while the current stack
# is still serving. Any failure before the final `up` exits here and leaves the
# running containers untouched.
set -eu

compose_file="${1:-}"

dc() {
  if [ -n "$compose_file" ]; then
    docker compose -f "$compose_file" "$@"
  else
    docker compose "$@"
  fi
}

dc pull
dc up -d --wait db
dc run --rm -T --no-deps migration
dc up -d
docker image prune -f
dc ps
