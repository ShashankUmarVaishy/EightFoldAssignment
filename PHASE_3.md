# Phase 3 Projection Layer: Deliverables & Architecture

This document tracks all modules, design paradigms, and testing mechanisms established during **Phase 3: Projection Layer & Configuration-Driven Remapping** of the Multi-Source Candidate Data Transformer.

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
│   └── utils/
│       └── logger.js
├── tests/
│   ├── ingestion.test.js
│   ├── coreEngine.test.js
│   └── projection.test.js
├── package.json
└── PHASE_3.md (This File)
```

---

## File Deliverables & Purposes

### Projection Module (`src/projector/`)

| File Path | Purpose & Description | Key Constraints / Behaviors |
| :--- | :--- | :--- |
| [`projectionLayer.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/projector/projectionLayer.js) | Decouples internal canonical data shapes from customizable downstream targets. | Implements path resolution via `lodash`, checks `on_missing` directives, and compiles schema validation rules dynamically using Zod. |
| [`tests/projection.test.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/tests/projection.test.js) | Dynamic test coverage. | Verifies path pointer mapping (e.g. `emails[0]`), error checks, omit/null missing flags, and dynamic type assertions. |

---

## Core Projection Paradigms

1. **Path Remapping & Aliasing**
   Utilizes `lodash/get` and `lodash/set` to parse complex string-based keys. This allows consumers to map nested fields like `emails[0]` -> `primary_email` or `location.country` -> `country_code` dynamically, flattening or nesting attributes.

2. **Missing-Value Directives (`on_missing`)**
   Executes three distinct policies when a mapped source path is not present in the canonical profile:
   * **`omit`**: Standardizes removal by leaving the target key undefined (completely excluded from output).
   * **`null`**: Standardizes missing fields explicitly to a JSON `null`.
   * **`error`**: Immediately aborts processing and throws a custom exception detailing the missing path.

3. **Dynamic Zod Verification**
   Compiles a dynamic Zod validation schema recursively at runtime using mapping configurations. This matches types (e.g. `string`, `number`, `boolean`, `array`, `object`) and validates the reshaped final object before generating output streams.

---

## How to Verify Phase 3

We implemented 8 additional test cases checking the path-mapping resolver, missing directives, type check failures, and bulk stringifiers.

To execute the full test suite (35 tests total):

```bash
npm test
```
