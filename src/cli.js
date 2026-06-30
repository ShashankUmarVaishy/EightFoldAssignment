#!/usr/bin/env node

import { program } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { ingestFile } from './ingestion/index.js';
import { runEngine } from './engine/index.js';
import { projectRecords } from './projector/projectionLayer.js';

/**
 * Main command-line application execution logic.
 */
async function main() {
  program
    .name('candidate-transformer')
    .description('Multi-Source Candidate Data Transformer CLI')
    .version('1.0.0')
    .requiredOption('-i, --inputs <files...>', 'Paths to candidate source files (JSON, CSV, PDF, TXT)')
    .requiredOption('-c, --config <file>', 'Path to the runtime projection configuration JSON')
    .option('-o, --output <file>', 'Path to write the resulting JSON output (prints to stdout if omitted)')
    .parse(process.argv);

  const options = program.opts();

  try {
    // 1. Read and parse configuration file
    let configContent;
    try {
      configContent = await fs.readFile(options.config, 'utf8');
    } catch (err) {
      throw new Error(`Failed to read configuration file: ${err.message}`);
    }

    let config;
    try {
      config = JSON.parse(configContent);
    } catch (err) {
      throw new Error(`Malformed JSON in configuration file: ${err.message}`);
    }

    // 2. Ingest all specified candidate files
    const envelopes = [];
    for (const filePath of options.inputs) {
      try {
        const env = await ingestFile(filePath);
        envelopes.push(env);
      } catch (err) {
        throw new Error(`Failed to ingest file (${filePath}): ${err.message}`);
      }
    }

    // 3. Process candidate records through Core Engine (Identity & Conflict Resolution)
    let resolvedCandidates;
    try {
      resolvedCandidates = runEngine(envelopes);
    } catch (err) {
      throw new Error(`Core Engine processing failure: ${err.message}`);
    }

    // 4. Project candidate profiles through dynamic formatting layer
    let outputString;
    try {
      outputString = projectRecords(resolvedCandidates, config);
    } catch (err) {
      throw new Error(`Projection Layer formatting failure: ${err.message}`);
    }

    // 5. Emit output JSON
    if (options.output) {
      const outDir = path.dirname(options.output);
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(options.output, outputString, 'utf8');
    } else {
      console.log(outputString);
    }
  } catch (err) {
    console.error(`[ERROR] Execution failed: ${err.message}`);
    process.exit(1);
  }
}

main();
