#!/usr/bin/env bash
# Run a command against the LOCAL scrape database (.env.scrape-local).
# Values exported here win over .env because dotenv and Prisma never override existing env vars.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f .env.scrape-local ]]; then
  echo "Missing .env.scrape-local (see README: Local scraping)" >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
. ./.env.scrape-local
set +a
case "$DATABASE_URL" in
  *localhost*|*127.0.0.1*) ;;
  *) echo "Refusing: .env.scrape-local DATABASE_URL is not a local database" >&2; exit 1 ;;
esac
exec "$@"
