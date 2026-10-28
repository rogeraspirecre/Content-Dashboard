#!/usr/bin/env bash
# Render start script. First boot seeds the persistent disk from the repo:
# the SQLite library, the packages already written, and the standing footer.
# After that the disk is the working copy and survives every redeploy.
set -e

if [ -n "$DB_PATH" ] && [ ! -f "$DB_PATH" ]; then
  mkdir -p "$(dirname "$DB_PATH")"
  cp ../db/brandon.db "$DB_PATH"
  echo "Seeded database to $DB_PATH"
fi

if [ -n "$CONTENT_ROOT" ]; then
  mkdir -p "$CONTENT_ROOT/outputs/packages" "$CONTENT_ROOT/second-brain"
  cp ../second-brain/youtube-description-footer.md "$CONTENT_ROOT/second-brain/"
  if [ -z "$(ls -A "$CONTENT_ROOT/outputs/packages" 2>/dev/null)" ]; then
    cp ../outputs/packages/*.md "$CONTENT_ROOT/outputs/packages/" 2>/dev/null || true
    echo "Seeded packages to $CONTENT_ROOT/outputs/packages"
  fi
fi

exec npm run start
