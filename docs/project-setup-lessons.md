# Project Setup Lessons Learned

*Created from real project experience - 2025-07-12*

## 🎯 Purpose

This document captures lessons learned during the Alexa Voice Memo project setup to help future projects avoid common pitfalls and establish better practices.

## 📚 What We Learned

### 1. **CDK Project Initialization Order Matters**

#### ❌ What We Did (Problematic)
```bash
# Started with existing documentation
alexa-voice-memo/
├── docs/           # Existing files
├── CLAUDE.md       # Existing files
├── LICENSE         # Existing files
└── README.md       # Existing files

# Then tried: cdk init app --language typescript
# Result: Error - "cannot be run in a non-empty directory!"
```

#### ✅ Correct Approach
```bash
# 1. Start with empty directory
mkdir alexa-voice-memo
cd alexa-voice-memo

# 2. CDK initialization first
cdk init app --language typescript

# 3. Git repository setup
git init
git add .
git commit -m "Initial CDK project setup"

# 4. Remote repository creation
gh repo create alexa-voice-memo --public
git remote add origin <repo-url>
git push -u origin main

# 5. Add documentation
mkdir docs
# Create documentation files
git add docs/
git commit -m "Add project documentation"
```

### 2. **File Backup and Recovery Complexity**

#### ❌ Problems Encountered
- File backup/restore operations became complex
- Multiple rounds of copying and moving files
- Risk of losing content during moves
- Git conflicts during rebase operations

#### ✅ Better Approach
- Plan directory structure from the beginning
- Use CDK's standard structure as the foundation
- Add custom files incrementally

### 3. **Git Repository Management**

#### ❌ Issues We Faced
```bash
# Created commits that needed to be reset
git reset --soft HEAD~1

# Ended up with duplicate directory structures
alexa-voice-memo/
├── cdk-project/    # Duplicate!
│   ├── docs/
│   └── bin/
├── docs/           # Original
└── bin/            # Moved from cdk-project/
```

#### ✅ Clean Git Workflow
```bash
# Single, clean commit history
git log --oneline
abc1234 Add documentation
def5678 Initial CDK project setup
```

## 🛠️ Recommended Project Setup Flow

### Phase 1: Foundation Setup
```bash
# 1. Create project directory
mkdir your-cdk-project
cd your-cdk-project

# 2. Initialize CDK (must be empty directory)
cdk init app --language typescript

# 3. Verify structure
ls -la
# Should see: bin/, lib/, test/, package.json, cdk.json, etc.
```

### Phase 2: Version Control
```bash
# 4. Initialize Git
git init

# 5. Initial commit
git add .
git commit -m "Initial CDK TypeScript project"

# 6. Create remote repository
gh repo create your-cdk-project --public

# 7. Connect and push
git remote add origin <repo-url>
git push -u origin main
```

### Phase 3: Documentation & Customization
```bash
# 8. Add project-specific files
mkdir docs
touch docs/README.md
touch CLAUDE.md

# 9. Customize package.json if needed
# Edit project name, description, etc.

# 10. Commit additions
git add .
git commit -m "Add project documentation and configuration"
git push
```

### Phase 4: Development Setup
```bash
# 11. Install dependencies (if not done by cdk init)
npm install

# 12. Verify build
npm run build

# 13. Verify CDK works
cdk synth

# 14. Ready for development!
```

## ⚠️ Common Pitfalls to Avoid

### 1. **Directory Not Empty Error**
```bash
# ❌ This will fail
mkdir project
cd project
echo "readme" > README.md
cdk init app --language typescript  # Error!

# ✅ This works
mkdir project
cd project
cdk init app --language typescript  # Success!
```

### 2. **Node Modules in Git**
```bash
# ❌ Don't commit node_modules
git add .  # Includes node_modules/

# ✅ Use proper .gitignore (CDK provides this)
node_modules/
*.js
*.d.ts
cdk.out/
```

### 3. **Package Name Conflicts**
```bash
# ❌ Generic names
"name": "cdk-project"

# ✅ Specific, meaningful names
"name": "alexa-voice-memo"
```

### 4. **Missing Environment Variables**
```bash
# ❌ Deploy without proper setup
cdk deploy  # May fail or deploy to wrong account

# ✅ Set up environment first
export CDK_ACCOUNT=123456789012
export CDK_REGION=ap-northeast-1
export CDK_ENV=dev
cdk deploy
```

## 📊 Time Comparison

### Our Experience (Suboptimal)
- Initial setup attempt: 30 minutes
- File backup/recovery: 45 minutes
- Git cleanup and restructuring: 30 minutes
- **Total: ~1 hour 45 minutes**

### Recommended Approach
- CDK initialization: 5 minutes
- Git setup: 5 minutes
- Documentation addition: 15 minutes
- **Total: ~25 minutes**

**Time Saved: ~1 hour 20 minutes**

## 🎯 Key Takeaways

1. **Plan Before Executing**: Think through the entire setup flow
2. **Follow CDK Conventions**: Don't fight the framework
3. **Empty Directory First**: Always start CDK projects in empty directories
4. **Incremental Commits**: Small, logical commits are easier to manage
5. **Document as You Go**: Capture decisions and learnings immediately

## 🔗 Related Documentation

- [CDK Getting Started Guide](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html)
- [Project Setup Guide](./setup-guide.md)
- [Development Guide](./development-guide.md)

## 📝 Template for Future Projects

```bash
#!/bin/bash
# CDK Project Setup Script

PROJECT_NAME=$1
if [ -z "$PROJECT_NAME" ]; then
  echo "Usage: $0 <project-name>"
  exit 1
fi

# 1. Create and enter directory
mkdir "$PROJECT_NAME"
cd "$PROJECT_NAME"

# 2. Initialize CDK
cdk init app --language typescript

# 3. Initialize Git
git init
git add .
git commit -m "Initial CDK TypeScript project"

# 4. Create remote repository (optional)
# gh repo create "$PROJECT_NAME" --public
# git remote add origin "git@github.com:username/$PROJECT_NAME.git"
# git push -u origin main

echo "✅ CDK project '$PROJECT_NAME' setup complete!"
echo "Next steps:"
echo "1. Set up AWS credentials and environment variables"
echo "2. Add project documentation"
echo "3. Start development"
```

---

## 💡 Final Thoughts

Every mistake is a learning opportunity. The confusion we experienced during setup led to valuable insights that will benefit future projects. The key is to capture these learnings immediately and establish better practices going forward.

**Remember**: Time spent on proper project setup is an investment that pays dividends throughout the development lifecycle.

*This document should be updated as we gain more experience with CDK project setups.*