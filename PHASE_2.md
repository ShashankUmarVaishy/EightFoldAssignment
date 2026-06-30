# Phase 2 Core Engine: Deliverables & Architecture

This document tracks all modules, design paradigms, and testing mechanisms established during **Phase 2: Core Engine** of the Multi-Source Candidate Data Transformer.

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
│   └── utils/
│       └── logger.js
├── tests/
│   ├── ingestion.test.js
│   └── coreEngine.test.js
├── package.json
└── PHASE_2.md (This File)
```

---

## File Deliverables & Purposes

### 1. Normalizer Adapters (`src/normalizers/`)

| File Path | Purpose & Description | Key Constraints / Behaviors |
| :--- | :--- | :--- |
| [`nameNormalizer.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/normalizers/nameNormalizer.js) | Standardizes candidate names. | Preserves Unicode letters (e.g. accents), strips digits/symbols, collapses spaces, and title-cases. |
| [`emailNormalizer.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/normalizers/emailNormalizer.js) | Standardizes candidate emails. | Validates structure, lower-cases, deduplicates, and sorts alphabetically. |
| [`phoneNormalizer.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/normalizers/phoneNormalizer.js) | Converts phone numbers to E.164. | Uses `libphonenumber-js`. Invalid numbers are dropped. |
| [`countryNormalizer.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/normalizers/countryNormalizer.js) | Standardizes country coordinates. | Uses `i18n-iso-countries`. Resolves ISO code from region text (comma tokens) or abbreviations. |
| [`dateNormalizer.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/normalizers/dateNormalizer.js) | Formats date timelines to `YYYY-MM`. | Handles "Present/Current" strings and parses dates using UTC to prevent timezone shifts. |

### 2. Matching & Resolution Core (`src/engine/`)

| File Path | Purpose & Description | Key Constraints / Behaviors |
| :--- | :--- | :--- |
| [`uuid.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/engine/uuid.js) | Generates deterministic identifiers. | Pure JS implementation of RFC 4122 UUIDv5 based on crypto SHA-1. |
| [`identityResolver.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/engine/identityResolver.js) | Groups records into candidate identities. | Multi-key grouping on email and phone. Prohibits matching solely on name. Flags phone collisions. |
| [`conflictResolver.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/engine/conflictResolver.js) | Merges attributes and resolves collisions. | Applies the Authority Matrix, resolves skills synonym matches, merges and deduplicates overlapping experiences. |
| [`index.js`](file:///c:/Users/ksush/BTech_7th-Sem/EightFoldAIAssigment/src/engine/index.js) | Core engine orchestrator entry point. | Runs the full matching, normalizations, and merging pipeline over raw parsed envelopes. |

---

## Core Algorithmic Paradigms

1. **The Authority Matrix**
   When values collide across records representing the same candidate, the engine selects the value from the highest-ranked source:
   * **Tier 1 (0.95):** ATS JSON (`json`)
   * **Tier 2 (0.85):** Resume PDF (`pdf`)
   * **Tier 3 (0.75):** API Profile (`github` / `linkedin` / `api`)
   * **Tier 4 (0.50):** Recruiter Notes (`txt` / `notes`)

2. **Deduplicated Experience & Duration**
   Experience items at matching companies are grouped and sorted. Overlapping timeline gaps are automatically intersected and merged. Total years of experience are calculated using inclusive month metrics and rounded to one decimal place.

3. **Synonym Unification**
   A synonym dictionary is applied during skill merges (e.g. `"js"` & `"nodejs"` -> `"javascript"` & `"node.js"`). Winning confidence for a skill is set to the maximum weight among sources that declared it.

4. **Harmony Penalty**
   The global profile `overall_confidence` is computed as the average of the winning weights of active fields, multiplied by $C_{\text{harmony}}$:
   * $C_{\text{harmony}} = 1.00$ (default consistency).
   * Drops to $0.80$ (20% penalty deduction) if there are contradictory values for `current_company`, source-specific `years_experience` values differ by > 1.0 year, or if a phone number collision is flagged.

5. **Traceability (Provenance Trail)**
   Every resolved property includes detailed audit tracking in the candidate's internal `provenance` array:
   ```json
   {
     "field": "full_name",
     "source": "sha256-hash-value",
     "method": "authority_matrix_tier_1"
   }
   ```

---

## How to Verify Phase 2

We implemented 12 additional test cases validating the normalizer adapters, matching engine, merge matrix, and harmony penalties.

To execute the full test suite (27 tests total):

```bash
npm test
```
