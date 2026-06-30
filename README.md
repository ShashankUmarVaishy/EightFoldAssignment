# Multi-Source Candidate Data Transformer

A high-fidelity Node.js platform designed to ingest, resolve, and merge candidate data profiles from multiple structured (CSV, ATS JSON) and unstructured (Resume PDFs, Recruiter Notes TXT) sources. 

This platform adheres strictly to the premise: **"Wrong-but-confident is worse than honestly-empty."** Malformed fields and parsing failures are logged cleanly and handled defensively (failing soft for unstructured data, and failing hard for corrupt structured files) rather than substituting mock or placeholder data.

---

## Technical Stack & Dependencies

* **Runtime:** Node.js (v18+ recommended; utilizes ES modules and native test runner)
* **Core Libraries:**
  * `csv-parse`: Parsing tabular candidate spreadsheets.
  * `pdf-parse`: Extracting raw text content from PDF resume streams.
  * `libphonenumber-js`: Formatting phone numbers to strict international E.164.
  * `i18n-iso-countries`: Mapping region text to strict ISO-3166 alpha-2 country codes.
  * `zod`: Dynamic runtime output schema validation.
  * `commander`: Command-Line Interface (CLI) options parsing.
  * `lodash`: Safely evaluating nested path pointers.

---

## Quickstart & Installation

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Unit and Integration Tests (35 assertions):**
   ```bash
   npm test
   ```

3. **Run End-to-End CLI Verification Suite:**
   ```bash
   node src/verify-cli.js
   ```

---

## CLI Invocations

The CLI application is packaged under `src/cli.js`.

### Options
* `-i, --inputs <files...>`: (Required) Space-separated paths of files to process.
* `-c, --config <file>`: (Required) Path to the projection configuration JSON file.
* `-o, --output <file>`: (Optional) Output destination path. If omitted, results are emitted to `stdout`.

### Invocations Examples

**1. Emitting results to console:**
```bash
node src/cli.js -i fixtures/candidate_ats.json fixtures/candidate_resume.txt -c fixtures/config_default.json
```

**2. Writing results to a target file:**
```bash
node src/cli.js -i fixtures/candidate_ats.json fixtures/candidate_resume.txt -c fixtures/config_custom.json -o output.json
```

---

## Core Processing & Architectural Assumptions

### 1. Ingestion Envelope
All input streams are normalized into a tracking envelope prior to merging:
```json
{
  "source_id": "sha256-...",
  "timestamp": "2026-06-30T15:30:00.000Z",
  "source_type": "csv | json | pdf | txt",
  "file_path": "path/to/source",
  "raw_content": <Parsed content object or raw text string>
}
```

### 2. Identity Resolution Prerequisite
* Records are merged into a single candidate profile **only** if they share a normalized email or phone number.
* Cross-matching on names alone is prohibited.
* If different candidate profiles share a phone number but have conflicting emails, they remain separate and are tagged with a phone collision warning.

### 3. Authority Matrix (Conflict Resolution)
Colliding scalar values are resolved using source tier weights:
* **Tier 1 (0.95):** ATS JSON (`json`)
* **Tier 2 (0.85):** Resume PDF (`pdf`)
* **Tier 3 (0.75):** API URL (`github` / `linkedin` / `api`)
* **Tier 4 (0.50):** Recruiter Notes (`txt` / `notes`)

### 4. Overall Confidence & Harmony Penalty
Computed as `(Sum(w_i) / N) * C_harmony`, where $w_i$ is the tier weight of the winning source for field $i$. 
The harmony multiplier $C_{\text{harmony}}$ drops to `0.80` (a 20% penalty) if:
* A phone number collision is flagged.
* Sources declare different values for `current_company`.
* Total experience calculations differ across sources by more than `1.0` year.

### 5. Timezone Shifts & Current Date Fallback
* Date parsing avoids timezone shifts by utilizing UTC calendar fields.
* Ongoing experiences marked as `"Present"` or `"Current"` fall back to **June 2026** (the system execution date) to calculate experience years.
