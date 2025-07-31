#!/bin/sh
# Exit immediately if a command exits with a non-zero status.
set -e

# Change the ownership of db.json to the node user and group.
# This ensures the application has the necessary permissions.
chown node:node /app/db.json

# Execute the command passed to this script (e.g., "node", "dist/index.js")
# The "exec" command replaces the shell process with the new process.
exec "$@"
