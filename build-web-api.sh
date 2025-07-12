#!/bin/bash

# Build web API Lambda function
echo "Building Web API Lambda..."

# Clean and create output directory
rm -rf dist/web-api
mkdir -p dist/web-api

# Copy handler
cp lib/alexa-voice-memo-stack.WebApiHandler.ts dist/web-api/index.ts

# Compile TypeScript
npx tsc dist/web-api/index.ts --outDir dist/web-api --lib es2020 --target es2020 --module commonjs --esModuleInterop

# Remove TypeScript file
rm dist/web-api/index.ts

# Copy package.json for dependencies
cat > dist/web-api/package.json << EOF
{
  "name": "web-api-handler",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "express": "^4.18.2",
    "@codegenie/serverless-express": "^4.14.0",
    "@aws-sdk/client-dynamodb": "^3.616.0",
    "@aws-sdk/lib-dynamodb": "^3.616.0"
  }
}
EOF

# Install production dependencies
cd dist/web-api
npm install --production
cd ../..

echo "Web API Lambda build complete!"