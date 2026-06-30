# Multi-Source Candidate Data Transformer — Architecture Blueprint

## 1. Core Principles
* **Objective:** Synthesize data from structured (CSV, ATS JSON) and unstructured (GitHub, LinkedIn, Resume PDFs, Notes) sources into a single trustworthy profile.
* **Golden Rule:** "Wrong-but-confident is worse than honestly-empty." Hallucinations or incorrect joins are critical failures. Missing data is acceptable.

## 2. Decoupled Pipeline Stages
1. **Detect & Ingest:** Safely extract raw streams/text layers and tag with an immutable `source_id`.
2. **Extract & Field-Map:** Map varying source keys to standard internal keys. 
3. **Normalize:** Strip padding, title-case names, and cast variables to strict standards.
4. **Identity Matching:** Group items into single identity buckets ONLY via matching normalized primary emails or unique E.164 phone numbers. 
5. **Merge & Reconcile:** Resolve field collisions via the Authority Matrix. Create a `provenance` array.
6. **Confidence Scoring:** Calculate numerical entity trust scores.
7. **Projection Layer:** Intercept the internal record and apply runtime config changes (renaming, pruning, missing-value handling).
8. **Validate & Emit:** Verify final shape against runtime config requirements and return JSON.

## 3. Strict Normalization Targets
* **candidate_id:** Deterministic UUIDv5 calculated using the lower-cased primary email.
* **phones:** Strict E.164 compliance via international prefixes (e.g., `+14155552671`).
* **location:** Country mapped strictly to ISO-3166 alpha-2 format.
* **experience / dates:** Standardized strictly to `YYYY-MM`.

## 4. Conflict Resolution (Authority Matrix)
* **Tier 1 (0.95 Trust):** ATS JSON Blobs / Verified Recruiter Exports.
* **Tier 2 (0.85 Trust):** First-Party Sourced Resume Files (.pdf / .docx text blocks).
* **Tier 3 (0.75 Trust):** Live API URLs (GitHub/LinkedIn profiles).
* **Tier 4 (0.50 Trust):** Raw Recruiter Notes (.txt scribbles).

## 5. Algorithmic Confidence Calculation
$$\text{Overall Confidence} = \left( \frac{\sum_{i=1}^{N} w_i}{N} \right) \times C_{\text{harmony}}$$
* Where $w_i$ is the tier weight of the winning source for field $i$.
* $C_{\text{harmony}} = 1.00$ if overlapping data matches, and drops to $0.80$ if active sources state explicitly contradictory values for primary fields.

## 6. Target Architecture & Stack
* **Language:** Node.js (JavaScript)
* **Core Libraries:** `csv-parse`, `pdf-parse`, `libphonenumber-js`, `i18n-iso-countries`, `zod`, `commander`, `lodash`