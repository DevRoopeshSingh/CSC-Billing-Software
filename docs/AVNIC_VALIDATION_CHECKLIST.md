# Avnac Integration Validation Checklist

## Phase 1: Prerequisites for Direct Integration Consideration

Before proceeding from iframe-based PoC to direct React integration, the following validation criteria must be met:

### 1. Licensing & Legal Compliance
- [ ] Verify Avnac license is MIT, Apache 2.0, or other permissive OSS license compatible with our commercial product
- [ ] Confirm no copyleft (GPL/LGPL) restrictions that would require open-sourcing our codebase
- [ ] Review any third-party dependencies in Avnac for licensing conflicts
- [ ] Document licensing approval from legal/compliance team

### 2. Repository Health & Maintenance
- [ ] Check commit frequency: minimum 1 commit per week over last 3 months
- [ ] Verify issue response time: maintainer responds to issues within 72 hours on average
- [ ] Confirm active maintenance: at least 2 maintainers with recent commits
- [ ] Review security advisories: no unpatched critical vulnerabilities in dependencies
- [ ] Validate build reliability: GitHub Actions/CI passes on main branch

### 3. Technical Compatibility
#### React & Router Compatibility
- [ ] Confirm Avnac uses React 18 (check package.json)
- [ ] Verify compatibility with our Next.js router mode (pages vs app directory)
- [ ] Test concurrent mode compatibility if applicable
- [ ] Validate hooks usage aligns with React 18 best practices

#### Dependency Alignment
- [ ] Audit Avnac's package.json for version conflicts with our dependencies:
  - React (must be ^18.0.0)
  - Fabric.js (we use ^5.3.0, must be compatible)
  - Tailwind CSS (if used, must not conflict with our utilities)
  - Any state management libraries (Zustand, Redux, etc.)
- [ ] Identify duplicate dependencies that would increase bundle size
- [ ] Plan deduplication strategy for shared dependencies

#### Storage Architecture Verification
- [ ] Confirm Avnac uses IndexedDB as primary storage mechanism
- [ ] Verify IndexedDB schema/key structure for design documents
- [ ] Validate live editing performance with IndexedDB (read/write latency)
- [ ] Assess feasibility of hybrid approach: IndexedDB (live) + PostgreSQL (sync)
- [ ] Document conflict resolution strategy for offline editing

#### Electron Performance Benchmarks
- [ ] Memory usage baseline: measure RSS/heap before/after iframe load
- [ ] Export latency: time from export click to PNG generation completion
- [ ] IPC overhead: measure postMessage latency between main/renderer processes
- [ ] Frame rate validation: ensure 60fps canvas rendering during interactions
- [ ] Test in both development and production Electron builds

### 4. Security Validation
#### postMessage Security
- [x] Implement strict origin validation for all incoming/outgoing messages *(done — `event.origin` checked against `new URL(avnacUrl).origin`)*
- [x] Validate message structure/schema to prevent injection attacks *(done — Zod `discriminatedUnion` rejects all malformed messages)*
- [x] Remove `allow-same-origin` + `allow-scripts` sandbox escape *(done — sandbox is now `allow-scripts allow-popups allow-downloads`)*
- [ ] Implement message rate limiting to prevent DoS via message flooding

#### Content Security
- [ ] Review Avnac's handling of user-generated SVGs/HTML for XSS risks
- [ ] Verify image proxy prevents cross-origin tainting vulnerabilities
- [ ] Audit any eval() or dynamic code generation in Avnac codebase
- [ ] Confirm no dangerous permissions requested (webcam, microphone without justification)

### 5. User Experience Validation
- [ ] Test keyboard accessibility in iframe context (tab trapping, shortcuts)
- [ ] Verify screen reader compatibility with embedded editor
- [ ] Validate touch/mouse event translation through iframe boundaries
- [ ] Confirm context menu handling (right-click) works correctly
- [ ] Test print functionality and clipboard operations

### 6. Performance Benchmarks (Week 2 Focus)
#### Memory Usage
- [ ] Baseline memory usage of CSC Billing without studio
- [ ] Memory usage after loading Avnac iframe
- [ ] Memory growth during extended editing session (15+ minutes)
- [ ] Memory release when navigating away from studio page
- [ ] Target: <50MB additional steady-state memory usage

#### Export Latency
- [ ] Measure time from export command to PNG blob availability
- [ ] Test with various canvas sizes (A4, social media poster, large banner)
- [ ] Target: <2 seconds for standard export, <5 seconds for large exports

#### IPC Overhead
- [ ] Measure round-trip time for postMessage between iframe and parent
- [ ] Test message throughput under load (simulated rapid saving)
- [ ] Target: <10ms average latency for simple messages

### Go/No-Go Criteria for Phase 2 (Direct Integration)
**Proceed to Phase 2 ONLY if ALL of the following are true:**
- [ ] Licensing approved by legal team
- [ ] Repository health shows active maintenance (≤30 days since last commit, responsive maintainers)
- [ ] No critical dependency conflicts that cannot be resolved through aliasing/deduplication
- [ ] Electron performance benchmarks meet targets:
  - Memory usage increase <50MB steady-state
  - Export latency <2 seconds for standard designs
  - IPC overhead <10ms average latency
- [x] Security validation — postMessage origin check, Zod schema validation, sandbox escape fix
- [ ] Storage architecture confirmed compatible with hybrid IndexedDB/PostgreSQL model

**If ANY criteria fail, remain in Phase 1 (iframe) and:**
- Document specific failure reasons
- Provide remediation recommendations
- Re-evaluate in next sprint after issues addressed

---
*Validation to be completed by end of Week 2 (May 31, 2026)*
*Results to be reviewed in technical architecture meeting before Phase 2 planning*