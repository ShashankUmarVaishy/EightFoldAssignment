# Multi-Source Candidate Data Transformer

A high-fidelity Node.js platform designed to ingest, resolve, and merge candidate data profiles from multiple structured (CSV, ATS JSON) and unstructured (Resume PDFs, Recruiter Notes TXT) sources. 


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