# Alexa Voice Memo - Setup Guide

*Generated from ideanotes project - 2025-07-12*

## 🚀 Prerequisites

### Required Software
```bash
# Node.js (v18 or later)
node --version  # Should be 18+

# AWS CLI v2
aws --version   # Should be 2.x

# AWS CDK CLI  
npm install -g aws-cdk
cdk --version   # Should be 2.x
```

### AWS Account Requirements
- Active AWS account
- IAM user with sufficient permissions
- Existing CDK bootstrap (can reuse from web3cdk)

## ⚙️ Environment Setup

### 1. AWS Credentials Configuration
```bash
# Configure AWS CLI (if not already done)
aws configure

# Verify access
aws sts get-caller-identity
```

### 2. Environment Variables
```bash
# Required environment variables
export CDK_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_REGION=ap-northeast-1  # or your preferred region
export CDK_ENV=dev

# Verify settings
echo "Account: $CDK_ACCOUNT"
echo "Region: $CDK_REGION" 
echo "Environment: $CDK_ENV"
```

### 3. CDK Bootstrap Verification
```bash
# Check if bootstrap exists (from web3cdk or other projects)
aws cloudformation describe-stacks --stack-name CDKToolkit --region $CDK_REGION

# If bootstrap doesn't exist, create it
cdk bootstrap aws://$CDK_ACCOUNT/$CDK_REGION
```

## 📁 Project Initialization

### 🎯 Important: Correct Setup Order

**⚠️ CRITICAL**: CDK initialization must be done in an empty directory!

Refer to [Project Setup Lessons Learned](./project-setup-lessons.md) for detailed explanation of why this matters.

#### Recommended Approach (Clean Start)
```bash
# 1. Create empty project directory
mkdir alexa-voice-memo
cd alexa-voice-memo

# 2. Initialize CDK (must be empty!)
cdk init app --language typescript

# 3. Verify project structure
ls -la
# Should see: bin/, lib/, test/, cdk.json, package.json, etc.

# 4. Initialize Git
git init
git add .
git commit -m "Initial CDK TypeScript project"

# 5. Add documentation
mkdir docs
# Add your documentation files
git add docs/
git commit -m "Add project documentation"
```

#### Alternative: Existing Repository Setup
```bash
# If you already have a repository with docs:

# 1. Backup existing files
mkdir backup
mv docs/ CLAUDE.md README.md backup/

# 2. Initialize CDK in now-empty directory
cdk init app --language typescript

# 3. Restore important files
cp -r backup/docs .
cp backup/CLAUDE.md .
# Merge or replace README.md as needed

# 4. Clean up
rm -rf backup/
```

### 1. CDK Project Setup (Legacy Documentation)

### 2. Dependencies Installation
```bash
# Install additional dependencies
npm install @aws-cdk/aws-dynamodb @aws-cdk/aws-lambda @aws-cdk/aws-iam

# Install development dependencies
npm install --save-dev @types/node jest ts-jest @types/jest

# Verify installation
npm list
```

### 3. TypeScript Configuration
```bash
# Verify TypeScript compilation
npm run build

# Setup watch mode for development
npm run watch &
```

## 🔧 Project Configuration

### 1. Update cdk.json
```json
{
  "app": "npx ts-node --project tsconfig.json bin/alexa-voice-memo.ts",
  "watch": {
    "include": [
      "**"
    ],
    "exclude": [
      "README.md",
      "cdk*.json",
      "**/*.js",
      "**/*.d.ts",
      "node_modules",
      "cdk.out",
      "test"
    ]
  },
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:enableStackNameDuplicates": true,
    "aws-cdk:enableDiffNoFail": true
  }
}
```

### 2. Update package.json Scripts
```json
{
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "test": "jest",
    "test:watch": "jest --watch",
    "cdk": "cdk",
    "deploy": "cdk deploy",
    "diff": "cdk diff",
    "destroy": "cdk destroy",
    "synth": "cdk synth"
  }
}
```

### 3. Jest Configuration
```json
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
```

## 🏗️ Initial Implementation

### 1. Create Basic Stack Structure
```bash
# Create lib/alexa-voice-memo-stack.ts
touch lib/alexa-voice-memo-stack.ts

# Create bin/alexa-voice-memo.ts
touch bin/alexa-voice-memo.ts

# Create src directory for Lambda code
mkdir src
touch src/handler.ts
```

### 2. Verify CDK Synthesis
```bash
# Generate CloudFormation template
cdk synth

# Should output CloudFormation YAML/JSON without errors
```

### 3. Initial Deployment Test
```bash
# Deploy empty stack (optional, for verification)
cdk deploy alexa-voice-memo-dev

# Check stack in AWS Console
aws cloudformation describe-stacks --stack-name alexa-voice-memo-dev
```

## 🧪 Development Environment Verification

### 1. CDK Commands Test
```bash
# List available stacks
cdk list

# Show diff (should be empty for new stack)
cdk diff

# Synthesize template
cdk synth

# Verify context
cdk context
```

### 2. TypeScript Compilation
```bash
# Compile TypeScript
npm run build

# Check for compilation errors
echo $?  # Should be 0
```

### 3. Test Framework
```bash
# Run tests (should pass even if empty)
npm test

# Coverage report
npm run test -- --coverage
```

## 📋 Environment Variables Reference

### Required Variables
```bash
CDK_ACCOUNT     # AWS account ID
CDK_REGION      # AWS region (e.g., ap-northeast-1)
CDK_ENV         # Environment name (dev/stg/prod)
```

### Optional Variables
```bash
CDK_DEFAULT_ACCOUNT   # Fallback account ID
CDK_DEFAULT_REGION    # Fallback region
AWS_PROFILE          # AWS CLI profile name
```

### Setting Variables
```bash
# Option 1: Environment variables
export CDK_ACCOUNT=123456789012
export CDK_REGION=ap-northeast-1
export CDK_ENV=dev

# Option 2: .env file (for local development)
echo "CDK_ACCOUNT=123456789012" > .env
echo "CDK_REGION=ap-northeast-1" >> .env
echo "CDK_ENV=dev" >> .env

# Option 3: AWS Profile
export AWS_PROFILE=my-profile
```

## 🔍 Troubleshooting

### Common Issues

#### 1. CDK Bootstrap Not Found
```bash
# Error: "This stack uses assets, so the toolkit stack must be deployed..."
# Solution: Run bootstrap
cdk bootstrap aws://$CDK_ACCOUNT/$CDK_REGION
```

#### 2. Permission Denied
```bash
# Error: "AccessDenied" or "Forbidden"
# Solution: Check IAM permissions
aws iam get-user
aws iam list-attached-user-policies --user-name your-username
```

#### 3. TypeScript Compilation Errors
```bash
# Error: TypeScript compilation failed
# Solution: Check tsconfig.json and dependencies
npm run build -- --verbose
```

#### 4. CDK Version Mismatch
```bash
# Error: CDK version conflicts
# Solution: Update all CDK packages to same version
npm update aws-cdk-lib
```

### Debug Commands
```bash
# Check AWS configuration
aws configure list

# Check CDK configuration  
cdk doctor

# Verbose CDK output
cdk deploy --verbose

# Debug level logging
CDK_DEBUG=true cdk deploy
```

## ✅ Setup Verification Checklist

### Environment Setup
- [ ] Node.js 18+ installed
- [ ] AWS CLI v2 installed and configured
- [ ] CDK CLI installed globally
- [ ] AWS credentials working
- [ ] Environment variables set

### Project Setup
- [ ] CDK project initialized
- [ ] Dependencies installed
- [ ] TypeScript compiles successfully
- [ ] CDK synth works
- [ ] Test framework configured

### AWS Setup
- [ ] CDK bootstrap exists
- [ ] IAM permissions sufficient
- [ ] Target region accessible
- [ ] Account ID correct

### Development Ready
- [ ] Watch mode working
- [ ] Tests run successfully
- [ ] CDK commands work
- [ ] Documentation accessible

## 🎯 Next Steps

After completing setup:

1. **Read Documentation**: `docs/cdk-specification.md` for complete technical specs
2. **Start Implementation**: Follow `docs/development-guide.md` Phase 1
3. **First Deployment**: Implement and deploy basic AlexaVoiceMemoStack
4. **Testing**: Set up unit and integration tests

---

## 💡 Setup Tips

1. **Use watch mode**: `npm run watch` for continuous compilation
2. **Incremental deployment**: Deploy frequently to catch issues early
3. **Environment isolation**: Use different CDK_ENV values for different environments
4. **Version pinning**: Pin CDK versions to avoid compatibility issues
5. **Documentation**: Keep this setup guide updated as project evolves

Ready to start implementing! 🚀