#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const projectRoot = path.join(__dirname, '..');
const webApiTsFile = path.join(projectRoot, 'lib', 'alexa-voice-memo-stack.WebApiHandler.ts');
const webApiDistDir = path.join(projectRoot, 'dist', 'web-api');
const webApiJsFile = path.join(webApiDistDir, 'index.js');

console.log('Building Web API Handler...');

// Ensure dist/web-api directory exists
if (!fs.existsSync(webApiDistDir)) {
  fs.mkdirSync(webApiDistDir, { recursive: true });
}

// Compile TypeScript to JavaScript
console.log('Compiling TypeScript...');
execSync(`npx tsc ${webApiTsFile} --outDir ${webApiDistDir} --module commonjs --target es2020 --skipLibCheck --esModuleInterop`, {
  cwd: projectRoot,
  stdio: 'inherit'
});

// Rename the output file to index.js
const compiledFile = path.join(webApiDistDir, 'alexa-voice-memo-stack.WebApiHandler.js');
if (fs.existsSync(compiledFile)) {
  fs.renameSync(compiledFile, webApiJsFile);
  console.log('Renamed to index.js');
}

// Create package.json for Lambda
const packageJson = {
  name: "web-api-handler",
  version: "1.0.0",
  main: "index.js",
  dependencies: {
    "express": "^4.18.2",
    "@codegenie/serverless-express": "^4.0.0",
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/lib-dynamodb": "^3.0.0"
  }
};

fs.writeFileSync(
  path.join(webApiDistDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

// Install dependencies
console.log('Installing dependencies...');
execSync('npm install --production', {
  cwd: webApiDistDir,
  stdio: 'inherit'
});

console.log('Web API Handler build complete!');