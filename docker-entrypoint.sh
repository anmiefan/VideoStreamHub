#!/bin/bash
set -e

# Wait for database to be ready
echo "Waiting for database..."
until pg_isready -h postgres -U streaming_user -d streaming_app; do
  echo "Database is unavailable - sleeping"
  sleep 1
done
echo "Database is ready"

# Run database migrations
echo "Running database migrations..."
npm run db:push

# Start nginx in background
echo "Starting nginx..."
nginx -g "daemon off;" &

# Start the application
echo "Starting application..."
exec node dist/server/index.js