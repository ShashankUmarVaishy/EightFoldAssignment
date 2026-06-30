# Demo Presentation Script: 2-Minute Outline

Use this guide/script as a structured roadmap for recording your 2-minute project demonstration video.

---

## Technical Overview & Core Architecture

### **[0:00 - 0:20] Segment 1: Hook & Objective**
* **Visual:** Show the root directory structure and the `README.md` file.
* **Talking Points:**
  > "Hi everyone. Today I'm demonstrating the **Multi-Source Candidate Data Transformer**, built in JavaScript/Node.js.
  > In recruitment analytics, we deal with severe data drift across structured files (ATS JSON exports, CSV records) and unstructured sources (Resume PDFs, Recruiter Notes).
  > Our golden rule is simple: **'Wrong-but-confident is worse than honestly-empty.'** We prioritize strict correctness and absolute traceability over placeholders."

---

### **[0:20 - 0:55] Segment 2: The Decoupled Pipeline**
* **Visual:** Open and highlight code sections in `src/ingestion/index.js`, `src/engine/identityResolver.js`, and `src/projector/projectionLayer.js`.
* **Talking Points:**
  > "To ensure maximum separation of concerns, our pipeline is divided into independent stages:
  > 1. **Ingestion Layer:** Reads CSV, ATS JSON, PDFs, and TXT files, wrapping them in envelopes with deterministic SHA-256 content hashes as immutable `source_ids`.
  > 2. **Core Engine:** Standardizes attributes (Unicode name cleaning, E.164 phones, ISO-3166 countries, and YYYY-MM UTC dates) before performing identity matching.
  > 3. **Projection Layer:** A config-driven formatting wrapper using Zod validation and lodash mappings to rename, select, or omit fields dynamically at runtime."

---

### **[0:55 - 1:30] Segment 3: Identity Matching & The Authority Matrix**
* **Visual:** Show the conflict resolution weights and harmony check inside `src/engine/conflictResolver.js`.
* **Talking Points:**
  > "Let's talk about our merge algorithms.
  > First, **Identity Resolution:** We map candidate buckets strictly via emails or phone numbers. If two records share different emails, name matches are barred to avoid collisions.
  > Second, **Conflict Resolution:** We use an **Authority Matrix** ranging from Tier 1 (0.95 weight for ATS JSON) down to Tier 4 (0.50 weight for Notes). Highest tier wins, and every decision is logged in an audit `provenance` array.
  > Third, **Confidence Harmony:** If sources contradict on key fields like `current_company` or experience duration, a **20% harmony penalty** is automatically applied."

---

### **[1:30 - 1:50] Segment 4: E2E Execution & Verification**
* **Visual:** Open a terminal and run `node src/verify-cli.js`. Show the successful output.
* **Talking Points:**
  > "Let's see it in action. By running our End-to-End CLI verification script, the system:
  > - Ingests JSON and plain text resume notes.
  > - Merges overlapping timelines (e.g. Google LLC and Google Inc. merge to a continuous range from Jan 2024 to Present).
  > - Projects custom nested shapes dynamically, verifying fields against Zod constraints.
  > All 35 of our pipeline and E2E unit tests pass successfully."

---

### **[1:50 - 2:00] Segment 5: Conclusion**
* **Visual:** Show the final projected JSON outputs in the `fixtures/` directory.
* **Talking Points:**
  > "This decoupled design ensures we can easily add new ingestion formats or output schemas without touching our core merging algorithms.
  > Thank you for watching!"
