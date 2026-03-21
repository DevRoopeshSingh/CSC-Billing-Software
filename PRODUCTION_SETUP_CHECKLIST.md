# GitHub Production-Readiness Setup Checklist

**Objective**: Transform your CSC Billing Software repository from "just pushed" to "production-ready and collaboration-friendly"

**Estimated Time**: 45-60 minutes

**Prerequisites**:
- Admin access to the repository
- GitHub CLI (optional but helpful): `brew install gh`

---

## Phase 1: Repository Configuration (10 minutes)

### 1. ✅ Enable Branch Protection (main)

> **Why**: Prevents accidental pushes to production, ensures CI passes before merge

**Steps**:
1. Go to **Settings** → **Branches**
2. Click **Add rule** under "Branch protection rules"
3. Pattern: `main`
4. Configure:
   - ✅ Require a pull request before merging
     - ✅ Require approvals (1)
     - ✅ Require review from code owners (if using CODEOWNERS)
     - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require status checks to pass before merging
     - **Required**:
       - `lint` (Lint & Type Check)
       - `test` (Build & Verify)
       - `integration` (Database & API)
   - ✅ Require conversation resolution before merging
   - ✅ Require branches to be up to date before merging
   - ✅ Include administrators (enforce rules for yourself too)
   - ✅ Restrict who can push to matching branches (optional, admin only)

**Verification**: Try pushing directly to main - should be blocked ✓

### 2. ✅ Enable Branch Protection (develop)

Repeat step 1 with pattern: `develop`
- Same settings as main (except "Include administrators" is optional)
- This branch is for feature integration

### 3. ✅ Set Default Branch

1. Go to **Settings** → **Branches**
2. Under "Default branch", set to `develop`
3. Confirm the change

**Why**: New branches and PRs will default to develop, not main

### 4. ✅ Configure Merge Strategy

1. Go to **Settings** → **General**
2. Under "Pull Requests" section:
   - ✅ Allow squash merging (recommended for clean history)
   - ✅ Allow rebase merging (optional)
   - ❌ Uncheck "Allow merge commits" (keeps history cleaner)
3. Set "Default to pull request title" for squash commits

**Why**: Keeps commit history clean and meaningful

---

## Phase 2: Automation & CI/CD (15 minutes)

### 5. ✅ Verify CI/CD Workflows

Already created files:
- `.github/workflows/ci.yml` - Runs on every push/PR
- `.github/workflows/release.yml` - Runs on version tags

**Verification**:
1. Go to **Actions** tab
2. You should see:
   - `CI` workflow (active)
   - `Release` workflow (active)

If workflows don't appear:
1. Push or create a PR to trigger
2. Check **Actions** → **Workflows** for any failures

**Status badges** (optional, add to README):
```markdown
![CI](https://github.com/DevRoopeshSingh/CSC-Billing-Software/actions/workflows/ci.yml/badge.svg)
![Release](https://github.com/DevRoopeshSingh/CSC-Billing-Software/actions/workflows/release.yml/badge.svg)
```

### 6. ✅ Configure Workflow Permissions

1. Go to **Settings** → **Actions** → **General**
2. Under "Workflow permissions":
   - ✅ Select "Read and write permissions"
   - ✅ "Allow GitHub Actions to create and approve pull requests" (optional)
3. Save

**Why**: Allows workflows to create releases and commit to repo if needed

### 7. ✅ Test CI Pipeline

**Create a test PR**:
```bash
git checkout -b test/ci-verification
echo "# CI Test" >> test-ci.md
git add test-ci.md
git commit -m "test: verify ci pipeline"
git push origin test/ci-verification
```

Then on GitHub:
1. Create Pull Request from `test/ci-verification` → `develop`
2. Wait for CI checks to complete (should take ~3-5 minutes)
3. Verify all checks pass:
   - lint ✓
   - test ✓
   - integration ✓
   - security ✓

**Close PR** (don't merge test branch):
```bash
git checkout develop
git branch -D test/ci-verification
```

---

## Phase 3: Security & Dependencies (10 minutes)

### 8. ✅ Enable Dependabot

Keeps dependencies updated and alerts for vulnerabilities

**Steps**:
1. Go to **Settings** → **Code security and analysis**
2. **Dependabot alerts**: Click **Enable** (auto-enabled for public repos)
3. **Dependabot security updates**: Click **Enable**
4. **Dependency graph**: Should be **Enabled**

**Configuration** (optional, add `.github/dependabot.yml`):
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    pull-request-branch-name:
      separator: "/"
    allow:
      - dependency-type: "all"
    reviewers:
      - "DevRoopeshSingh"
```

**Result**: Automatic PRs for dependency updates

### 9. ✅ Configure Security Policy

Create `SECURITY.md` in root:

```markdown
# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability, please email security@example.com instead of using the issue tracker.

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide an estimated timeline for a fix.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅ Yes    |
| 0.x     | ❌ No     |

## Security Updates

Security updates are released as soon as possible after verification.
```

### 10. ✅ Enable Secret Scanning (Public Repo Only)

If repo is public:
1. Go to **Settings** → **Code security and analysis**
2. **Secret scanning**: Click **Enable**
3. **Push protection**: Click **Enable** (prevents accidental commits)

---

## Phase 4: Collaboration Setup (15 minutes)

### 11. ✅ Create Issue Templates

Create `.github/ISSUE_TEMPLATE/` directory and files:

**Bug Report** (`.github/ISSUE_TEMPLATE/bug_report.md`):
```markdown
---
name: Bug Report
about: Report a problem you encountered
labels: bug
---

## Description
Brief description of the bug.

## Steps to Reproduce
1. Step 1
2. Step 2
3. ...

## Expected Behavior
What should happen?

## Actual Behavior
What actually happened?

## Environment
- OS: macOS / Windows
- App Version: v0.1.0
- Node Version: 18.x

## Screenshots
If applicable, add screenshots.

## Logs
```
Paste relevant error logs here
```
```

**Feature Request** (`.github/ISSUE_TEMPLATE/feature_request.md`):
```markdown
---
name: Feature Request
about: Suggest an enhancement
labels: enhancement
---

## Description
Clear description of what you want to add.

## Use Case
Why do you need this feature?

## Proposed Solution
How should it work?

## Alternatives
Are there other ways to solve this?

## Additional Context
Any other information?
```

### 12. ✅ Create Pull Request Template

Create `.github/pull_request_template.md`:
```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Related Issue
Closes #[issue-number]

## Testing
- [ ] Manual testing completed
- [ ] Tests added/updated
- [ ] No regressions found

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No console warnings/errors

## Screenshots (if applicable)
Add screenshots for UI changes.
```

### 13. ✅ Create CODEOWNERS File

Create `.github/CODEOWNERS`:
```
# Automatically request reviews from code owners
*                    @DevRoopeshSingh
src/app/api/*        @DevRoopeshSingh
src/components/*     @DevRoopeshSingh
prisma/*             @DevRoopeshSingh
electron/*           @DevRoopeshSingh
```

**Why**: Automatically requests reviews from maintainers for relevant areas

### 14. ✅ Create Discussion Categories (Optional)

For better community engagement:

1. Go to **Settings** → **Discussions** (if not visible, enable it)
2. Create categories:
   - **Announcements** - Release notes and updates
   - **General** - General discussion
   - **Q&A** - Questions and answers
   - **Ideas** - Feature ideas
   - **Show & Tell** - Share your usage

---

## Phase 5: Project Management (12 minutes)

### 15. ✅ Create Project Board

1. Go to **Projects** tab
2. Click **New project**
3. **Name**: "Development Roadmap"
4. **Template**: "Table"
5. **Create**

**Columns to create**:
- Backlog
- In Progress
- In Review
- Done

**Initial issues to add**:
1. "Setup production workflows" (Done)
2. "Add database encryption" (Backlog)
3. "Implement invoice templates" (Backlog)
4. "Add dark mode" (Backlog)
5. "Release v1.0.0" (Backlog)

### 16. ✅ Create GitHub Issues (Log Tracking)

Create initial issues for tracking:

**Issue 1: Setup Complete**
```
Title: ✅ Repository Production-Ready
Body:
- [x] Branch protection rules configured
- [x] CI/CD workflows verified
- [x] Documentation created
- [x] Dependabot enabled
- [x] Issue templates added

Closes with initial setup phase.
```

**Issue 2: Database Features**
```
Title: 🔒 Add SQLite Encryption
Body:
Consider migrating to sqlcipher for sensitive deployments.
- [ ] Research sqlcipher integration
- [ ] Update Prisma config
- [ ] Test encryption/decryption
- [ ] Document setup

Type: enhancement
```

**Issue 3: Documentation**
```
Title: 📖 API Documentation
Body:
Create comprehensive API documentation.
- [ ] Endpoint reference
- [ ] Example requests/responses
- [ ] Error codes reference
- [ ] OpenAPI/Swagger spec

Type: documentation
```

### 17. ✅ Add Labels

Customize issue labels for better organization:

**Go to**: **Issues** → **Labels**

**Create**:
- 🐛 `bug` (Red) - Bug reports
- ✨ `enhancement` (Blue) - Feature requests
- 📖 `documentation` (Purple) - Doc updates
- 🔒 `security` (Red-Dark) - Security issues
- ⚡ `performance` (Orange) - Performance improvements
- 🎉 `good first issue` (Green) - For new contributors
- 🚨 `critical` (Red) - Urgent issues
- ❓ `question` (Gray) - Questions

---

## Phase 6: Documentation & Onboarding (8 minutes)

### 18. ✅ Verify Documentation Files

Confirm these files exist in root:
- ✅ `README.md` - Main documentation
- ✅ `CONTRIBUTING.md` - Contributor guide
- ✅ `SECURITY.md` - Security policy
- ✅ `LICENSE` - MIT License (create if missing)

**Create LICENSE** if missing:
```bash
# Use MIT License (recommended)
curl https://opensource.org/licenses/MIT > LICENSE
```

### 19. ✅ Create CHANGELOG.md (Optional but Recommended)

Create `CHANGELOG.md`:
```markdown
# Changelog

All notable changes to CSC Billing Software will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Initial setup phase items

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

## [0.1.0] - 2026-03-19

### Added
- Initial release
- Core billing functionality
- Offline-first capability
- Electron packaging

---

[Unreleased]: https://github.com/DevRoopeshSingh/CSC-Billing-Software/compare/v0.1.0...develop
[0.1.0]: https://github.com/DevRoopeshSingh/CSC-Billing-Software/releases/tag/v0.1.0
```

### 20. ✅ Create .env.example

Create `.env.example` for new contributors:
```bash
# Database
DATABASE_URL="file:./dev.db"

# Optional: Set in production by Electron
# USER_DATA_PATH will be automatically configured
```

---

## Phase 7: Final Verification (5 minutes)

### 21. ✅ Commit All New Files

```bash
git add .github/ README.md CONTRIBUTING.md SECURITY.md CHANGELOG.md .env.example
git commit -m "docs: setup production-readiness assets

- Add CI/CD workflows (ci.yml, release.yml)
- Create comprehensive README and CONTRIBUTING guide
- Add security and changelog documentation
- Setup GitHub templates and configuration"

git push origin main  # Or develop, based on your branching strategy
```

### 22. ✅ Verify Repository Health

**GitHub's Repository Settings Check**:
1. Go to **Settings** → **General**
2. Scroll to "Repository details"
3. Verify:
   - ✅ Description is set
   - ✅ Homepage/website set (optional)
   - ✅ Topics added: `electron`, `next-js`, `billing`, `sqlite`
   - ✅ License is MIT
   - ✅ Discussions enabled (optional)

**Add Topics**:
1. Go to repository home page
2. Click "Add topics" in right sidebar
3. Add: `electron` `next-js` `billing` `sqlite` `electron-app` `react`

### 23. ✅ Test Actual Workflow

Create a test feature branch and PR:

```bash
# Create test branch
git checkout develop
git pull origin develop
git checkout -b feature/test-workflow

# Make a small change
echo "# Test Feature" >> test-feature.md
git add test-feature.md
git commit -m "feat: test workflow integration"
git push origin feature/test-workflow
```

**On GitHub**:
1. Create PR: `feature/test-workflow` → `develop`
2. Fill out PR template completely
3. Verify CI runs and passes
4. Request review from yourself (or collaborator)
5. Approve and merge (test squash merge)
6. Verify branch is deleted automatically

### 24. ✅ Test Release Process

Once everything is stable, test a release:

```bash
# Create version tag
git checkout main
git pull origin main
git tag -a v0.1.0 -m "Initial release"
git push origin v0.1.0
```

**On GitHub**:
1. Go to **Actions** tab
2. Wait for **Release** workflow to start
3. Monitor build progress:
   - macOS DMG build
   - Windows EXE build
   - GitHub Release creation
4. When complete, verify release on **Releases** page

---

## ✅ Post-Setup Verification Checklist

Use this checklist to verify everything is working:

```
Repository Configuration:
☐ Branch protection rules active for main and develop
☐ Default branch is develop
☐ Merge strategy configured (squash merge enabled)
☐ PR template visible when creating PR

CI/CD:
☐ CI workflow runs on all PRs
☐ Release workflow triggers on version tags
☐ All status checks pass on test PR
☐ Workflow permissions set to "read and write"

Security:
☐ Dependabot alerts enabled
☐ Dependabot security updates enabled
☐ SECURITY.md file present
☐ Secret scanning enabled (if public)

Collaboration:
☐ Issue templates available (Bug & Feature)
☐ PR template visible
☐ CODEOWNERS file present
☐ Issue labels created and organized

Documentation:
☐ README.md complete with quickstart
☐ CONTRIBUTING.md with detailed guidelines
☐ CHANGELOG.md tracking versions
☐ .env.example for setup reference
☐ Topics added to repository

Project Management:
☐ Project board created with issues
☐ Initial issues logged and categorized
☐ Discussions enabled (optional)

Testing:
☐ Test PR successful with CI passing
☐ Squash merge tested
☐ Release workflow tested with version tag
☐ GitHub Release created with binaries
```

---

## 🚀 Next Steps After Setup

### Immediate (This Week)
1. Invite team members as collaborators
2. Add them to CODEOWNERS
3. Set up branch protection review requirements
4. Create initial milestone for v1.0

### Short-term (This Month)
1. Establish team communication channel (Slack/Discord/etc)
2. Schedule standup/sync meetings
3. Begin tracking work in project board
4. Create initial roadmap in discussions

### Long-term (Quarter)
1. Increase test coverage
2. Add integration test suite
3. Setup artifact caching for faster builds
4. Consider code coverage reporting (Codecov, etc)
5. Plan documentation site (GitHub Pages, Vercel, etc)

---

## 📞 Troubleshooting

### Workflows Not Running
- Check `.github/workflows/` directory exists
- Verify workflow files are in root `.github/workflows/`
- Go to **Actions** → **Workflows** → Fix any errors
- Trigger by creating a test PR

### Branch Protection Not Working
- Verify status checks names match exactly in workflow
- Clear cache: **Settings** → **Branches** → Re-save rule
- Check that administrator override is properly configured

### Release Workflow Failing
- Verify Node.js version in workflow matches development
- Check `npm run build` works locally
- Ensure `npm run electron:build` works on your OS
- Review error logs in **Actions** tab

### Dependabot Not Creating PRs
- Verify Dependabot is enabled in **Settings**
- Check `package.json` and `package-lock.json` are present
- Wait up to 24 hours for initial scan

---

## 📚 Additional Resources

- [GitHub Flow Guide](https://guides.github.com/introduction/flow/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Semantic Versioning](https://semver.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**✅ Setup Complete!** Your repository is now production-ready and collaboration-friendly.

**Estimated total time to completion: 45-60 minutes**

Last updated: 2026-03-19
