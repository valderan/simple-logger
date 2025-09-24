#!/bin/bash

# Check if node_modules directory exists
if [ ! -d "node_modules" ]; then
  echo "node_modules directory not found. Running npm install..."
  npm install
else
  echo "node_modules directory found. Skipping npm install."
fi

# Run project build
echo "Running project build..."
npm run build

# Start Docker container
echo "Starting Docker container..."
docker compose -f docker-compose.prod.yml up -d