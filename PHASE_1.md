# Phase 1 Ingestion: Deliverables & Architecture

This document tracks all modules, design paradigms, and testing mechanisms established during **Phase 1: Ingestion** of the Multi-Source Candidate Data Transformer.

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
│   └── utils/
│       └── logger.js
├── tests/
│   └── ingestion.test.js
├── ARCHITECTURE_BPM.md
├── Candidate_Data_Transformer_Execution_Plan.pdf
├── package.json
└── PHASE_1.md (This File)
```

---

## File Deliverables & Purposes

| File Path | Component | Purpose & Description | Key Constraints / Behaviors |
| :--- | :--- | :--- | :--- |
| [`package.json`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/package.json) | Configuration | Manages node dependencies and scripts. Configured as ES module. | Uses native test runner (`node --test`). |
| [`src/utils/logger.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/utils/logger.js) | Diagnostics | Structured execution logging framework tracking info, warnings, and errors. | Preserves source contexts (`source_id`) without candidate data leakage. |
| [`src/ingestion/jsonParser.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/ingestion/jsonParser.js) | Structured Adapter | Parses structured ATS JSON blobs. | **Fail-Hard**: Rejects malformed JSON syntax immediately, throwing an exception. |
| [`src/ingestion/csvParser.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/ingestion/csvParser.js) | Structured Adapter | Parses structured candidate CSV records. | **Fail-Hard**: Enforces columns integrity; mismatching columns throw errors. |
| [`src/ingestion/pdfExtractor.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/ingestion/pdfExtractor.js) | Unstructured Adapter | Safe extraction of text layer from Resume PDFs using `pdf-parse`. | **Fail-Soft**: If pdf stream is corrupted, returns `""` empty string and logs diagnostic warn/error. |
| [`src/ingestion/txtExtractor.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/ingestion/txtExtractor.js) | Unstructured Adapter | Safely extracts text from recruiter plain text notes. | **Fail-Soft**: Fallback to `""` on read/decoding issues. |
| [`src/ingestion/index.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/ingestion/index.js) | Ingestion Orchestrator | File-type detection, SHA-256 identifier generation, and ingestion metadata wrapping. | Wraps outputs into the standard ingestion envelope. |
| [`tests/ingestion.test.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/tests/ingestion.test.js) | Verification | Suite of unit tests checking parsing execution, envelope validation, and robust fail-soft targets. | Mutes output channels dynamically for clean logs reporting. |

---

## Core Design Paradigms

1. **Deterministic Identity Tracking (`source_id`)**
   Every ingestion envelope is tagged with a unique, immutable `source_id` generated via `sha256(fileContent + filename)`. This prevents collisions and guarantees traceability.

2. **Ingestion Envelope Standard**
   All parser adapters emit an envelope structure:
   ```json
   {
     "source_id": "sha256-5eb63bbbe01eeed093cb22bb8f5acdc3...",
     "timestamp": "2026-06-30T15:40:02.123Z",
     "source_type": "csv | json | pdf | txt",
     "file_path": "path/to/source.pdf",
     "raw_content": <Parsed Data or Extracted Text String>
   }
   ```

3. **Strict Correctness Boundaries**
   * **Structured inputs (JSON, CSV):** Highly syntax-strict. Formatting errors throw parsing exceptions immediately.
   * **Unstructured inputs (PDF, TXT):** High resilience. Extraction errors are handled locally, returning empty string contents without crashing execution lines.

---

## How to Verify Phase 1

To install project dependencies and execute the ingestion unit tests:

```bash
# Install dependencies
npm install

# Run the test suite
npm test
```
