# Changelog

All notable changes to CSC Billing Software will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Production-readiness setup checklist and documentation
- CI/CD workflows (GitHub Actions)
- Contributing guidelines with branching strategy
- Security policy and reporting guidelines
- Issue and pull request templates
- CODEOWNERS configuration

### Changed
- Enhanced README with complete documentation

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- Added security.md with vulnerability reporting process
- Configured Dependabot for dependency scanning

## [0.1.0] - 2026-03-19

### Added
- Initial release of CSC Billing Software
- Core billing functionality
  - Customer management
  - Service catalog
  - Invoice creation and management
  - PDF generation
  - Backup and restore
- Offline-first capability
  - SQLite local database
  - Full functionality without internet
- Desktop application
  - Electron packaging for macOS and Windows
  - Auto-update capability
- UI Features
  - Dashboard with statistics
  - Responsive design
  - Dark/light theme support
  - PIN-based security
- API Endpoints
  - RESTful API for all operations
  - JSON request/response format

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- PIN protection for sensitive operations
- Secure IPC bridge in Electron
- Context isolation enabled
- Node integration disabled

---

## How to Release a New Version

1. Update version in `package.json`
2. Update this file:
   - Move items from `[Unreleased]` to new version
   - Add date in `YYYY-MM-DD` format
3. Commit: `git commit -m "chore: release v1.2.0"`
4. Tag: `git tag -a v1.2.0 -m "Release version 1.2.0"`
5. Push: `git push origin main && git push origin v1.2.0`
6. GitHub Actions automatically builds and releases

## Version Format

```
## [X.Y.Z] - YYYY-MM-DD

### Added
- Feature description

### Changed
- Change description

### Deprecated
- Deprecated feature

### Removed
- Removed feature

### Fixed
- Bug fix

### Security
- Security fix
```

---

[Unreleased]: https://github.com/DevRoopeshSingh/CSC-Billing-Software/compare/v0.1.0...develop
[0.1.0]: https://github.com/DevRoopeshSingh/CSC-Billing-Software/releases/tag/v0.1.0
