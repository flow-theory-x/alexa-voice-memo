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

// First, compile all TypeScript files
console.log('Compiling all TypeScript...');
execSync('npx tsc', {
  cwd: projectRoot,
  stdio: 'inherit'
});

// Copy the compiled file to index.js
const compiledFile = path.join(projectRoot, 'dist', 'lib', 'alexa-voice-memo-stack.WebApiHandler.js');
if (fs.existsSync(compiledFile)) {
  // Read the file content
  let content = fs.readFileSync(compiledFile, 'utf8');
  
  // Fix the import paths
  content = content.replace(/require\("\.\.\/src\//g, 'require("./src/');
  
  // Write to index.js
  fs.writeFileSync(webApiJsFile, content);
  console.log('Created index.js with fixed paths');
} else {
  throw new Error(`Compiled file not found: ${compiledFile}`);
}

// Copy dependencies
console.log('Copying dependencies...');
const srcDir = path.join(projectRoot, 'dist', 'src');
const webApiSrcDir = path.join(webApiDistDir, 'src');

if (fs.existsSync(srcDir)) {
  execSync(`cp -r ${srcDir} ${webApiSrcDir}`, {
    cwd: projectRoot,
    stdio: 'inherit'
  });
  console.log('Copied src directory');
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