# Proof of Concept: Avnac Iframe Integration for CSC Billing Design Studio

## Overview
This document summarizes the PoC implementation of an iframe-based architecture for integrating Avnac (a local-first browser design editor) into the CSC Billing Design Studio. The PoC focuses exclusively on establishing the technical foundation for integration while deferring direct integration decisions until after validation checklist completion.

## Implementation Summary

### Core Components Created

1. **IframeEditor.tsx** (`src/components/studio/IframeEditor.tsx`)
   - Secure iframe wrapper for Avnac editor (`http://localhost:3300`)
   - Strict origin validation for all postMessage communications
   - Message handling for design save/load events
   - Authentication context passing to iframe
   - Periodic design state synchronization

2. **CanvasEditor.tsx** (`src/components/studio/CanvasEditor.tsx`)
   - Main studio interface with design library sidebar
   - Integration with AuthContext for user authentication
   - Design saving/loading handlers that bridge iframe and PostgreSQL
   - UI controls for new design, export, and deletion
   - Status bar showing sync state

3. **Validation Checklist** (`docs/AVNIC_VALIDATION_CHECKLIST.md`)
   - Comprehensive prerequisites for direct integration consideration
   - Covers licensing, repo health, technical compatibility, security, UX, and performance
   - Defines clear go/no-go criteria for Phase 2

4. **Performance Test Script** (`scripts/test-avnac-performance.js`)
   - Framework for measuring memory usage, export latency, and IPC overhead
   - To be executed in Week 2 for validation benchmarks

## Technical Implementation Details

### Security Measures
- **Origin Validation**: All postMessage interactions validate the sender's origin against `new URL(avnacUrl).origin`
- **Message Structure**: Messages follow a strict `{type, payload}` format with type checking
- **Sandboxed Iframe**: Uses `allow-scripts allow-popups allow-downloads` (allow-same-origin intentionally excluded — combining it with allow-scripts allows sandbox escape)
- **Authentication Context**: User token passed securely via postMessage after iframe signals readiness

### Storage Architecture (Hybrid Model)
- **Live Editing Layer**: Avnac's native IndexedDB storage remains unchanged for immediate responsiveness
- **Synchronization Layer**: 
  - When Avnac signals `DESIGN_SAVED`, design data is sent to parent window
  - Parent window stores design in PostgreSQL via Next.js API routes (to be implemented)
  - On design load request, parent fetches from PostgreSQL and sends to iframe
- **Conflict Handling**: Last-write-wins with timestamps (to be refined in Phase 2)

### Communication Protocol
Message types implemented in PoC:
- `IFRAME_READY`: Sent by Avnac when initialized
- `SET_AUTH_CONTEXT`: Parent sends user token to iframe
- `DESIGN_SAVED`: Avnac notifies parent of locally saved design
- `DESIGN_LOADED**: Avnac confirms design load completion
- `GET_CURRENT_DESIGN`: Parent periodically requests current design state
- `LOAD_DESIGN_BY_ID`: Parent requests specific design load (requires Avnac modification)

## Week 2 Testing Plan

### Performance Analysis in Electron Environment
1. **Memory Usage**
   - Baseline measurement before studio load
   - Steady-state measurement after 15 minutes of editing
   - Memory leak detection during extended session
   - Target: <50MB additional steady-state usage

2. **Export Latency**
   - Time from export command to PNG blob availability
   - Tested with multiple canvas sizes (A4, social media, large banner)
   - Target: <2 seconds for standard exports

3. **IPC Overhead**
   - Round-trip postMessage latency measurement
   - Message throughput under simulated load
   - Target: <10ms average latency

### Validation Checklist Execution
- Complete all items in `docs/AVNIC_VALIDATION_CHECKLIST.md`
- Specific focus on:
  - Licensing verification
  - Repository health assessment
  - React/Next.js compatibility confirmation
  - Storage architecture validation
  - Electron performance benchmarks

## Next Steps

### Immediate (Week 1)
- Deploy Avnac development server locally on port 3300
- Integrate IframeEditor into studio route
- Verify basic functionality: design creation, editing, export
- Confirm postMessage communication works in Electron build

### Week 2
- Execute performance test script in Electron environment
- Complete validation checklist
- Gate review: determine if criteria met for Phase 2 consideration

### If Validation Passes (Week 3+)
- Begin direct integration exploration:
  - Extract Avnac frontend components
  - Align dependencies (React, fabric.js)
  - Implement storage adapter layer
  - Replace iframe with direct component usage

### If Validation Fails
- Document specific failure reasons
- Provide remediation recommendations
- Continue with iframe-based solution as interim approach
- Re-evaluate in next sprint after issue resolution

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Dependency conflicts | Use webpack aliasing, version alignment in PoC phase |
| CSS/Tailwind conflicts | Iframe isolation prevents CSS leakage; for direct integration, use CSS Modules or Shadow DOM |
| Storage synchronization complexity | Hybrid model preserves live editing experience while adding cloud sync |
| Security vulnerabilities in postMessage | Strict origin validation and message sanitization |
| Performance degradation in Electron | Early benchmarking allows course correction |

## Conclusion
The iframe-based PoC provides a secure, performant foundation for integrating Avnac's design editor capabilities into CSC Billing while maintaining architectural flexibility. By strictly separating integration concerns from validation criteria, we ensure informed decision-making about deeper integration while delivering immediate user value through the design studio feature.