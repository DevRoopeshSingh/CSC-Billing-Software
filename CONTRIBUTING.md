# Contributing to CSC Billing Software

Thank you for your interest in contributing to CSC Billing Software! This guide will help you understand our development process, code standards, and how to get your contributions merged.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Branching Strategy](#branching-strategy)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Code Style](#code-style)
- [Documentation](#documentation)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to the Contributor Covenant [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Git 2.37+
- macOS or Windows (for Electron development)

### Fork and Clone

1. **Fork the repository** on GitHub
   - Click the "Fork" button on the repository page
   
2. **Clone your fork locally**
   ```bash
   git clone https://github.com/YOUR-USERNAME/CSC-Billing-Software.git
   cd CSC-Billing-Software
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/DevRoopeshSingh/CSC-Billing-Software.git
   ```

## Development Setup

### Install Dependencies

```bash
npm install
```

### Configure Environment

```bash
# Create environment file
cp .env.example .env.local

# Edit .env.local with your settings (optional for development)
```

### Initialize Database

```bash
# Generate Prisma Client
npm run db:generate

# Create/apply migrations (uses dev.db by default)
npm run db:migrate
```

### Start Development

```bash
# Option 1: Next.js only (fastest for web UI development)
npm run dev
# Opens at http://localhost:3000

# Option 2: Full Electron with Next.js
npm run electron:dev
# Launches desktop app with hot reload
```

### Verify Setup

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build
npm run build
```

## Branching Strategy

We use a modified Git Flow model:

### Branch Naming Convention

**Format**: `<type>/<description>`

```
feature/invoice-templates       # New feature
fix/pdf-generation-crash        # Bug fix
docs/update-readme             # Documentation
refactor/service-api-cleanup    # Code improvement
chore/upgrade-dependencies      # Maintenance
test/add-invoice-tests         # Tests
```

### Main Branches

- **`main`** - Production-ready code
  - Protected branch (requires PR review)
  - Always releases stable versions
  - Only merge from `release/` or `hotfix/` branches

- **`develop`** - Integration branch for features
  - Protected branch (requires PR review)
  - Base branch for all feature branches
  - Regular CI/CD runs

### Feature Branches

Create from `develop`:

```bash
git checkout develop
git pull upstream develop
git checkout -b feature/your-feature-name

# Make changes...
git push origin feature/your-feature-name
```

### Release Branches

For version releases from `develop`:

```bash
git checkout develop
git pull upstream develop
git checkout -b release/v1.2.0

# Only version bumps and hotfixes allowed
# Then merge to main and tag
```

### Hotfix Branches

For urgent production fixes from `main`:

```bash
git checkout main
git pull upstream main
git checkout -b hotfix/critical-issue

# Fix the issue
# Then merge to both main and develop
```

## Commit Guidelines

### Commit Message Format

Follow the **Conventional Commits** specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (no logic change)
- **refactor**: Code refactoring without feature change
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Dependencies, config, tooling
- **ci**: CI/CD changes

### Examples

**Simple commit:**
```bash
git commit -m "feat(billing): add invoice template selection"
```

**Detailed commit:**
```bash
git commit -m "fix(pdf): handle special characters in customer names

- Escape special chars in PDF text rendering
- Add test case for comma-separated names
- Fixes issue #123"
```

**Multi-line with footer:**
```bash
git commit -m "refactor(api): restructure invoice endpoints

The invoice endpoints now follow RESTful conventions:
- POST /api/invoices for creation
- GET /api/invoices/[id] for retrieval
- PUT /api/invoices/[id] for updates
- DELETE /api/invoices/[id] for deletion

BREAKING CHANGE: /api/invoice endpoint removed, use /api/invoices instead
Closes #456"
```

### Best Practices

✅ **Do:**
- Keep commits atomic (one logical change per commit)
- Write commits in imperative mood ("add feature" not "added feature")
- Reference issues in footer: `Closes #123`
- Sign commits: `git commit -S`

❌ **Don't:**
- Mix unrelated changes in one commit
- Use vague messages like "fix stuff" or "updates"
- Commit large files or node_modules
- Force-push to shared branches

## Pull Request Process

### Before Creating a PR

1. **Update your branch**
   ```bash
   git fetch upstream
   git rebase upstream/develop
   ```

2. **Ensure tests pass**
   ```bash
   npm run lint
   npm run build
   ```

3. **Test your changes**
   ```bash
   npm run dev
   # Test manually in the app
   ```

### Create a Pull Request

1. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open PR on GitHub**
   - Title: Clear, descriptive title
   - Description: Use the PR template (if available)

### PR Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
Describe how you tested these changes:
- [ ] Manual testing in dev
- [ ] Created/updated tests
- [ ] Tested on multiple browsers (if applicable)

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated
- [ ] Commit messages follow conventions
```

### PR Review Process

1. **Automated Checks**
   - CI/CD pipeline runs (lint, build, tests)
   - Coverage reports (if enabled)

2. **Code Review**
   - At least one maintainer reviews
   - Changes may be requested
   - Constructive feedback provided

3. **Approval & Merge**
   - After approval, maintainer merges PR
   - Squash-and-merge or rebase (maintainer decision)
   - Branch is deleted

### Review Comments

Respond to all review comments, even if just acknowledging:

```markdown
✅ Done - applied the suggested changes
📝 Changed to use const instead of let
❓ This was intentional because... [explanation]
```

## Testing

### Running Tests

```bash
# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Build (verifies compilation)
npm run build

# Database validation
npx prisma validate
```

### Writing Tests

- Use `.test.ts` or `.test.tsx` file extension
- Use descriptive test names
- Test both happy path and error cases
- Keep tests focused and independent

### Test Checklist

Before submitting PR:
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No lint errors (`npm run lint`)
- [ ] Application builds successfully (`npm run build`)
- [ ] Manual testing completed
- [ ] Database migrations work (`npm run db:migrate`)

## Code Style

### TypeScript

```typescript
// Use strict mode
"use strict";

// Type everything
interface UserInput {
  name: string;
  email: string;
}

// Prefer const
const config = { timeout: 5000 };

// Use arrow functions
const calculateTotal = (items: Item[]): number => {
  return items.reduce((sum, item) => sum + item.price, 0);
};

// Avoid any, use unknown or specific types
const processData = (data: unknown): string => {
  if (typeof data === "string") return data;
  return String(data);
};
```

### React Components

```typescript
// Use functional components with hooks
export const InvoiceList: React.FC<Props> = ({ items }) => {
  const [filter, setFilter] = useState<string>("");

  return (
    <div>
      {items.map((item) => (
        <InvoiceItem key={item.id} invoice={item} />
      ))}
    </div>
  );
};

// Use TypeScript for props
interface InvoiceItemProps {
  invoice: Invoice;
  onEdit?: (id: number) => void;
}

export const InvoiceItem: React.FC<InvoiceItemProps> = ({ invoice, onEdit }) => {
  // Component logic
};
```

### ESLint Configuration

This project uses ESLint with Next.js config. Check `.eslintrc.json` for rules.

```bash
# Auto-fix fixable issues
npm run lint -- --fix
```

## Documentation

### When to Document

- New features must include documentation
- API changes need endpoint documentation
- Complex logic needs code comments
- User-facing features need README updates

### Documentation Format

**Code Comments:**
```typescript
// Use clear, concise comments
// Explain WHY, not WHAT

// Good
// Use transaction to ensure atomicity
await prisma.$transaction(...)

// Bad
// Loop through items
for (const item of items) {}
```

**README Sections:**
- Update table of contents
- Add feature to feature list
- Update API docs if applicable
- Include usage examples

**Changelog Entry:**
Add to unreleased section:
```markdown
## [Unreleased]

### Added
- New feature description

### Fixed
- Bug fix description

### Changed
- Breaking change description
```

## Release Process

### Version Numbering

Follow **Semantic Versioning** (SemVer):
- **Major** (1.0.0): Breaking changes
- **Minor** (1.2.0): New features (backward compatible)
- **Patch** (1.0.1): Bug fixes

### Creating a Release

1. **Update version** in `package.json`
   ```json
   {
     "version": "1.2.0"
   }
   ```

2. **Update CHANGELOG.md**
   ```markdown
   ## [1.2.0] - 2026-03-20
   
   ### Added
   - Feature 1
   - Feature 2
   
   ### Fixed
   - Bug 1
   ```

3. **Create release PR**
   ```bash
   git checkout -b release/v1.2.0
   git commit -m "chore: bump version to 1.2.0"
   git push origin release/v1.2.0
   ```

4. **Merge and tag**
   ```bash
   # After PR is merged to main
   git checkout main
   git pull origin main
   git tag v1.2.0
   git push origin v1.2.0
   ```

5. **GitHub Actions** automatically builds and releases binaries

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Release notes prepared
- [ ] Tag created and pushed
- [ ] Binaries successfully built
- [ ] Release announced (if appropriate)

## Getting Help

- **Questions**: Use [GitHub Discussions](https://github.com/DevRoopeshSingh/CSC-Billing-Software/discussions)
- **Bugs**: Open an [Issue](https://github.com/DevRoopeshSingh/CSC-Billing-Software/issues)
- **Security**: Email security@example.com (don't open public issues)

## Recognition

Contributors will be recognized in:
- CHANGELOG.md
- Release notes
- GitHub contributors graph

Thank you for contributing! 🎉

---

**Last Updated**: 2026-03-19
