# Multi-Source Candidate Data Transformer: Directory Map & Execution Guide

This reference file contains a directory breakdown of the project and guides you on how to execute the data pipeline for both structured and unstructured inputs.

---

## Directory & File Structure

```text
EightFoldAIAssigment/
├── src/                          # Project Source Files
│   ├── ingestion/                # Ingestion Layer
│   │   ├── csvParser.js          # Ingests & validates CSV tabular rows
│   │   ├── jsonParser.js         # Ingests & validates ATS JSON objects
│   │   ├── pdfExtractor.js       # Extracts text from Resume PDF buffers (fail-soft)
│   │   ├── txtExtractor.js       # Extracts text from Recruiter Notes TXT (fail-soft)
│   │   └── index.js              # Orchestrator: generates SHA-256 IDs & timestamp envelopes
│   │
│   ├── normalizers/              # Normalization Adapters
│   │   ├── nameNormalizer.js     # Cleans name, title-cases, preserves Unicode letters
│   │   ├── emailNormalizer.js    # Normalizes structure, lower-cases, and sorts emails
│   │   ├── phoneNormalizer.js    # Formats numbers to E.164 using libphonenumber-js
│   │   ├── countryNormalizer.js  # Maps country names to ISO-3166 alpha-2
│   │   └── dateNormalizer.js     # Standardizes timelines to YYYY-MM UTC
│   │
│   ├── engine/                   # Identity & Merging Core
│   │   ├── uuid.js               # Generates deterministic UUIDv5 candidate identifiers
│   │   ├── identityResolver.js   # Groups records by email/phone; extracts text streams
│   │   ├── conflictResolver.js   # Implements Authority Matrix, merging, and confidence
│   │   └── index.js              # Orchestrator: matches and resolves candidate groups
│   │
│   ├── projector/                # Projection Layer
│   │   └── projectionLayer.js    # Remaps paths (lodash) and verifies outputs (Zod)
│   │
│   ├── cli.js                    # Production Command-Line Interface (CLI) application
│   └── verify-cli.js             # End-to-End CLI Verification and mock sandbox script
│
├── tests/                        # Test Suites (Node.js Native Runner)
│   ├── ingestion.test.js         # Validates Phase 1 parsers and fail-soft fallbacks
│   ├── coreEngine.test.js        # Validates Phase 2 engine matching and conflict logic
│   └── projection.test.js        # Validates Phase 3 path remapping and validation limits
│
├── fixtures/                     # Dynanically generated test candidate files & configurations
│
├── package.json                  # Dependencies and execution commands
├── README.md                     # Project installation & operations guide
├── PROJECT_REFERENCE.md          # (This File) Directory Map and execution guides
└── thinking.txt                  # Technical design architecture one-pager
```

---

## How to Run the Pipeline & Validate Outputs

Use the CLI application (`src/cli.js`) to parse files. In your demo video, you can demonstrate execution using the following commands.

### Prerequisite: Install Dependencies
First, ensure project packages are installed:
```bash
npm install
```

### 1. Execute for Structured Sources (JSON & CSV)
Suppose you have a structured ATS JSON export and a Recruiter CSV file.
You can run the pipeline like this:

```bash
# Output results directly to the console (stdout)
node src/cli.js -i fixtures/candidate_ats.json -c fixtures/config_default.json

# Process and save structured files to an output JSON file
node src/cli.js -i fixtures/candidate_ats.json -c fixtures/config_default.json -o fixtures/output_default.json
```

### 2. Execute for Unstructured Sources (PDF & TXT)
Unstructured inputs like notes or text resume logs are parsed dynamically using text extractors:

```bash
# Output unstructured text extraction results to stdout
node src/cli.js -i fixtures/candidate_resume.txt -c fixtures/config_default.json

# Process and save unstructured output
node src/cli.js -i fixtures/candidate_resume.txt -c fixtures/config_default.json -o fixtures/output_resume.json
```

### 3. Execute Multi-Source Synthesis (Structured + Unstructured)
To demonstrate the core identity matching, conflict resolution, and years of experience timeline merging, process both structured and unstructured files together:

```bash
# Merges the ATS JSON (Tier 1) and Resume TXT (Tier 2/4) into a single profile
node src/cli.js -i fixtures/candidate_ats.json fixtures/candidate_resume.txt -c fixtures/config_custom.json -o fixtures/output_custom.json
```

*Verify the result in `fixtures/output_custom.json` to show:*
* **Unified Profile:** Alice's details are merged into a single candidate profile.
* **Name & Contact merging:** The name "Shashank Kumar" from the ATS JSON wins over the notes name due to matrix weights.
* **Timeline Merging:** Google LLC (ATS) and Google Inc (Resume text) are merged to a continuous timeline `2024-01` to `Present` (2.5 years of experience).
* **Harmony Penalty:** The average trust score falls to `0.76` due to the harmony warning penalty because the sources reported different experience timelines.

### 4. Execute the Automatic Verification Runner
To demonstrate the full E2E setup working at once, run:
```bash
node src/verify-cli.js
```
This runs the full CLI commands, writes test configurations, and validates candidate snapshots in under 1 second.
