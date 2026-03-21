# GitHub Setup - Quick Reference

**Complete this checklist in GitHub's web interface to make your repo production-ready.**

All files and documentation are already created in your repository. Follow these steps to configure GitHub.

---

## Phase 1: Branch Protection (5 min)

### Main Branch
1. **Settings** → **Branches** → **Add rule**
   - Pattern: `main`
   - ✅ Require PR reviews before merge (1 approval)
   - ✅ Require status checks: `lint`, `test`, `integration`
   - ✅ Require conversation resolution
   - ✅ Require branches up to date

### Develop Branch
1. **Settings** → **Branches** → **Add rule**
   - Pattern: `develop`
   - Same settings as `main`

### Set Default Branch
1. **Settings** → **Branches** → Set default to `develop`

---

## Phase 2: Merge Strategy (2 min)

1. **Settings** → **General** → **Pull Requests**
   - ✅ Allow squash merging
   - ✅ Allow rebase merging
   - ❌ Uncheck "Allow merge commits"

---

## Phase 3: Actions Permissions (1 min)

1. **Settings** → **Actions** → **General**
   - ✅ "Read and write permissions"
   - ✅ Allow GitHub Actions to create and approve pull requests

---

## Phase 4: Dependabot (2 min)

1. **Settings** → **Code security and analysis**
   - ✅ Enable **Dependabot alerts**
   - ✅ Enable **Dependabot security updates**
   - ✅ Enable **Secret scanning** (if public repo)

---

## Phase 5: Repository Details (2 min)

1. **Repository home page** → Click "Add topics"
   - Add: `electron`, `next-js`, `billing`, `sqlite`, `react`

2. **Settings** → **General**
   - Set Description: "Offline-capable desktop billing software for Digital Service Centers"
   - Set License: **MIT**

---

## Phase 6: Verify Everything (3 min)

✅ **Check Points**:
- [ ] **Actions** tab shows CI and Release workflows
- [ ] **Issues** template options include Bug, Feature, Documentation
- [ ] **Pull Requests** show the PR template
- [ ] **Code** directory shows `.github/` folder
- [ ] `.github/CODEOWNERS` file is present

---

## Phase 7: Test the Setup (5 min)

### Create Test PR
```bash
git checkout -b feature/test-setup
echo "# Test" >> test.md
git add test.md
git commit -m "test: verify github setup"
git push origin feature/test-setup
```

Then on GitHub:
1. Create PR → `develop`
2. Wait for CI to pass
3. Merge using squash merge
4. Delete branch

---

## Testing Release Workflow (Optional)

Once everything is stable:
```bash
git tag v0.1.0
git push origin v0.1.0
```

Then:
1. Go to **Actions** tab
2. Watch **Release** workflow build binaries
3. Check **Releases** page for created release

---

## Summary

| Step | Location | Action | Time |
|------|----------|--------|------|
| 1 | Settings → Branches | Add protection for main/develop | 5 min |
| 2 | Settings → General | Configure merge strategy | 2 min |
| 3 | Settings → Actions | Enable workflow permissions | 1 min |
| 4 | Settings → Code security | Enable Dependabot | 2 min |
| 5 | Repository home | Add topics and description | 2 min |
| 6 | Multiple locations | Verify all files present | 3 min |
| 7 | Terminal + GitHub | Test PR workflow | 5 min |
| **Total** | | | **20 min** |

---

## Files Already Created

✅ Workflows:
- `.github/workflows/ci.yml` - Linting, building, testing
- `.github/workflows/release.yml` - Binary releases on tags

✅ Templates:
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/ISSUE_TEMPLATE/documentation.md`
- `.github/pull_request_template.md`
- `.github/CODEOWNERS`

✅ Documentation:
- `README.md` - Complete documentation
- `CONTRIBUTING.md` - Contributor guide
- `SECURITY.md` - Security policy
- `CHANGELOG.md` - Version history
- `PRODUCTION_SETUP_CHECKLIST.md` - Detailed setup guide
- `.env.example` - Environment configuration template

---

## Need Help?

- **CI/CD Questions**: See `.github/workflows/ci.yml` and `release.yml`
- **Contributing Questions**: See `CONTRIBUTING.md`
- **API Questions**: See `README.md` API Documentation section
- **Security Issues**: See `SECURITY.md`

---

**Once you complete the GitHub interface steps above, your repository will be production-ready!** 🚀
