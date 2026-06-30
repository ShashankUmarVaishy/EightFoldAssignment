# Phase 4 Interface & CLI: Deliverables & Architecture

This document tracks all modules, design paradigms, and testing mechanisms established during **Phase 4: Interface & CLI** of the Multi-Source Candidate Data Transformer.

---

## Directory Structure

```text
EightFoldAIAssigment/
├── src/
│   ├── ingestion/
│   │   ├── csvParser.js
│   │   ├── index.js
│   │   ├── jsonParser.js
│   │   ├── pdfExtractor.js
│   │   └── txtExtractor.js
│   ├── normalizers/
│   │   ├── nameNormalizer.js
│   │   ├── emailNormalizer.js
│   │   ├── phoneNormalizer.js
│   │   ├── countryNormalizer.js
│   │   └── dateNormalizer.js
│   ├── engine/
│   │   ├── uuid.js
│   │   ├── identityResolver.js
│   │   ├── conflictResolver.js
│   │   └── index.js
│   ├── projector/
│   │   └── projectionLayer.js
│   ├── cli.js
│   └── verify-cli.js
├── tests/
│   ├── ingestion.test.js
│   ├── coreEngine.test.js
│   └── projection.test.js
├── package.json
├── README.md
└── PHASE_4.md (This File)
```

---

## File Deliverables & Purposes

### 1. Interface App Entry Point (`src/`)

| File Path | Purpose & Description | Key Constraints / Behaviors |
| :--- | :--- | :--- |
| [`cli.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/cli.js) | Production entry point for transforming files. | Uses `commander` to capture input paths, output paths, and schema files. Catches and formats errors gracefully without trace dumps. |
| [`verify-cli.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/verify-cli.js) | E2E integration verification script. | Creates sandbox inputs/schemas in `fixtures/`, runs shell processes, and evaluates outputs against gold snapshots. |

### 2. General Release Documentation

| File Path | Purpose & Description | Key Details Included |
| :--- | :--- | :--- |
| [`README.md`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/README.md) | Standard deployment and release documentation. | Quickstart details, command invocation scripts, mapping layouts, and structural processing assumptions. |

---

## Core Packaging & Operational Paradigms

1. **Clean Error Trapping**
   Any execution failure (from missing inputs, syntax configuration errors, or schema validation mismatches) is trapped by the CLI orchestrator. It yields structured error descriptions to `console.error` and shuts down with process exit code `1` rather than throwing uncaught stack-trace dumps.

2. **Integration Verification Sandbox**
   `verify-cli.js` executes E2E operations. It sets up files dynamically, runs processes programmatically, and runs assertions checking:
   * Record merging and grouping (ATS JSON + Resume TXT).
   * Schema projections (default flat and custom nested layouts).
   * Deduplication of experience timelines and experience duration metrics.
   * Harmony multiplier checks (asserting correct calculations).

---

## Final Project Status

All four phases of the project blueprint are successfully delivered. The test suite comprises:
* **Ingestion Tests:** 13 parser validations.
* **Core Engine Tests:** 12 normalization, UUIDv5, matching, and merging validations.
* **Projection Layer Tests:** 7 pruning, omit, null, and Zod validator validations.
* **CLI E2E Tests:** 3 full system E2E validations.

Total passing test assertions: **35**.

To run all unit tests:
```bash
npm test
```

To run E2E verification:
```bash
node src/verify-cli.js
```
