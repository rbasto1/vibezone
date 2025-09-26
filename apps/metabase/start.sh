#!/bin/bash

# Load environment variables from .env file in the same directory
if [ -f ".env" ]; then
    # Load environment variables, ignoring comments
    export $(grep -v '^#' .env | xargs)
else
    echo "Error: .env file not found in $(pwd)"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$MB_DB_CONNECTION_URI" ]; then
    echo "Error: MB_DB_CONNECTION_URI is not set in .env"
    exit 1
fi

if [ -z "$MB_ENCRYPTION_SECRET_KEY" ]; then
    echo "Error: MB_ENCRYPTION_SECRET_KEY is not set in .env"
    exit 2
fi

# Start Metabase with the environment variables
echo "Starting Metabase with the following configuration:"
echo "Database: ${MB_DB_CONNECTION_URI%%@*}"  # Show connection without password

docker run -d -p 3000:3000 \
  -e MB_DB_CONNECTION_URI="$MB_DB_CONNECTION_URI" \
  -e MB_ENCRYPTION_SECRET_KEY="$MB_ENCRYPTION_SECRET_KEY" \
  --name metabase metabase/metabase:latest
