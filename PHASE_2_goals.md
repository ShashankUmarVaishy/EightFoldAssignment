Task: Implement Phase 2 - The Core Normalization, Resolution, and Merge Engine

Context:
Phase 1 is complete; we can successfully ingest raw source strings. We must now build the core transformation algorithms. Refer to our main specification document to maintain strict alignment with our structural criteria.

Instructions for Code Generation:
1. Create a dedicated `/src/normalizers/` directory. Use `libphonenumber-js` for phone numbers (E.164 format) and `i18n-iso-countries` for country codes (ISO-3166 alpha-2). Implement a strict date-formatter turning timelines into `YYYY-MM`.
2. Build the Identity Resolution registry map. Deduplicate and group incoming records strictly by matching normalized primary emails or unique phone strings. Do not match candidates solely by name.
3. Build the Conflict Resolution Module. Apply our Authority Matrix Tier system weights (Tier 1: 0.95 down to Tier 4: 0.50) to select winning values when inputs conflict.
4. For every resolved property, dynamically append metadata tracking parameters to the candidate's internal `provenance` array detailing its exact source and extraction method.
5. Implement the algorithmic overall_confidence formula, ensuring a 20% penalty multiplier reduction if overlapping sources provide contradictory values for key timeline fields.

Generate an Antigravity Task Artifact detailing your module architecture design for this merge loop. Wait for my confirmation block before writing the logic files.