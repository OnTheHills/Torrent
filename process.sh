#!/bin/sh
set -eu

# Resolve paths from this script, including when invoked from another directory.
PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$PROJECT_DIR"

ACTION=${1:-up}
if [ "$#" -gt 0 ]; then shift; fi
case "$ACTION" in
  up) ;;
  secrets)
    if [ "$#" -gt 0 ]; then
      echo "Usage: ./process.sh secrets" >&2
      exit 1
    fi
    ;;
  -h|--help)
    echo "Usage: ./process.sh [up [service ...] | secrets]"
    echo "  up       Prepare secrets and build/start services (default: entire stack)."
    echo "  secrets  Only prepare secrets from backend/.env."
    exit 0
    ;;
  *)
    echo "Usage: ./process.sh [up [service ...] | secrets]" >&2
    exit 1
    ;;
esac

if [ ! -f backend/.env ]; then
  echo "Create backend/.env from backend/.env.example before running setup." >&2
  exit 1
fi
if [ -L backend/.secrets ]; then
  echo "backend/.secrets must not be a symbolic link." >&2
  exit 1
fi
mkdir -p backend/.secrets
chmod 700 backend/.secrets

# Run setup as the host user so generated files stay owner-readable on Linux.
SECRET_SETUP_UID=$(id -u)
SECRET_SETUP_GID=$(id -g)
export SECRET_SETUP_UID SECRET_SETUP_GID
docker compose --profile setup run --rm --no-deps --build secrets-init

if [ "$ACTION" = up ]; then
  exec docker compose up -d --build --force-recreate "$@"
fi
