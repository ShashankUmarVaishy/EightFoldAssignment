import test from 'node:test';
import assert from 'node:assert';
import { parseJSON } from '../src/ingestion/jsonParser.js';
import { parseCSV } from '../src/ingestion/csvParser.js';
import { extractPDF } from '../src/ingestion/pdfExtractor.js';
import { extractTXT } from '../src/ingestion/txtExtractor.js';
import { detectSourceType, generateSourceId, ingestContent } from '../src/ingestion/index.js';
import logger from '../src/utils/logger.js';

// Mute console output during test execution to keep test report clean
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function muteConsole() {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

function restoreConsole() {
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
}

test('Ingestion Phase 1 Suite', async (t) => {
  
  // Set up mute context for tests
  muteConsole();
  t.after(() => {
    restoreConsole();
  });

  await t.test('JSON Parser - Valid JSON', () => {
    const validJson = '{"name": "Alice", "skills": ["Javascript", "Node.js"]}';
    const result = parseJSON(validJson, 'test-json-valid');
    assert.strictEqual(result.name, 'Alice');
    assert.deepStrictEqual(result.skills, ['Javascript', 'Node.js']);
  });

  await t.test('JSON Parser - Malformed JSON', () => {
    const malformedJson = '{"name": "Alice", "skills": ["Javascript", "Node.js"'; // missing closing bracket
    assert.throws(() => {
      parseJSON(malformedJson, 'test-json-malformed');
    }, /Malformed JSON structure/);
  });

  await t.test('JSON Parser - Empty/Invalid Inputs', () => {
    assert.throws(() => parseJSON('', 'test-json-empty'), /Invalid input/);
    assert.throws(() => parseJSON(null, 'test-json-null'), /Invalid input/);
  });

  await t.test('CSV Parser - Valid CSV', () => {
    const validCsv = 'name,email,role\nBob,bob@example.com,Developer\nCharlie,charlie@example.com,Designer';
    const result = parseCSV(validCsv, 'test-csv-valid');
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].name, 'Bob');
    assert.strictEqual(result[0].email, 'bob@example.com');
    assert.strictEqual(result[1].role, 'Designer');
  });

  await t.test('CSV Parser - Inconsistent Column Count', () => {
    const invalidCsv = 'name,email,role\nBob,bob@example.com\nCharlie,charlie@example.com,Designer'; // Row 1 has missing column
    assert.throws(() => {
      parseCSV(invalidCsv, 'test-csv-invalid');
    }, /Malformed CSV structure/);
  });

  await t.test('CSV Parser - Empty/Invalid Inputs', () => {
    assert.throws(() => parseCSV('', 'test-csv-empty'), /Invalid input/);
    assert.throws(() => parseCSV(undefined, 'test-csv-undefined'), /Invalid input/);
  });

  await t.test('PDF Extractor - Corrupt/Malformed PDF (Fail-Soft Check)', async () => {
    const corruptBuffer = Buffer.from('PDF-1.4 %âãÏÓ ... not a real pdf ...');
    const result = await extractPDF(corruptBuffer, 'test-pdf-corrupt');
    // Corrupt PDF extraction must fail soft and return an empty string
    assert.strictEqual(result, '');
    
    // Logger should have captured the event
    const lastErrorLog = logger.getLogs().find(log => log.level === 'ERROR' && log.source_id === 'test-pdf-corrupt');
    assert.ok(lastErrorLog);
    assert.match(lastErrorLog.message, /PDF Extraction Failed/);
  });

  await t.test('PDF Extractor - Invalid inputs', async () => {
    const resultNull = await extractPDF(null, 'test-pdf-null');
    assert.strictEqual(resultNull, '');
  });

  await t.test('TXT Extractor - Valid string and buffer', () => {
    const txtString = 'Recruiter Note: candidate is highly qualified.';
    const txtBuffer = Buffer.from('Buffer text contents');
    
    const resultStr = extractTXT(txtString, 'test-txt-str');
    const resultBuf = extractTXT(txtBuffer, 'test-txt-buf');
    
    assert.strictEqual(resultStr, txtString);
    assert.strictEqual(resultBuf, 'Buffer text contents');
  });

  await t.test('TXT Extractor - Fail-soft on invalid type', () => {
    const result = extractTXT({ invalid: 'type' }, 'test-txt-invalid');
    assert.strictEqual(result, '');
  });

  await t.test('Orchestrator - File type detection', () => {
    assert.strictEqual(detectSourceType('resume.pdf'), 'pdf');
    assert.strictEqual(detectSourceType('/path/to/data.json'), 'json');
    assert.strictEqual(detectSourceType('C:\\Users\\test\\notes.txt'), 'txt');
    assert.strictEqual(detectSourceType('candidates.csv'), 'csv');
    assert.throws(() => detectSourceType('invalid.doc'), /Unsupported file extension/);
  });

  await t.test('Orchestrator - Source ID Generation is deterministic', () => {
    const content = 'Hello world candidate profile';
    const path = 'profile.txt';
    
    const id1 = generateSourceId(content, path);
    const id2 = generateSourceId(content, path);
    const idDiffContent = generateSourceId('Hello world diff', path);
    const idDiffPath = generateSourceId(content, 'diff.txt');
    
    assert.strictEqual(id1, id2);
    assert.notStrictEqual(id1, idDiffContent);
    assert.notStrictEqual(id1, idDiffPath);
    assert.match(id1, /^sha256-[a-f0-9]{64}$/);
  });

  await t.test('Orchestrator - Ingestion Envelope wrapping', async () => {
    const content = '{"name":"David"}';
    const envelope = await ingestContent(content, 'json', 'david.json');
    
    assert.ok(envelope.source_id);
    assert.ok(envelope.timestamp);
    assert.strictEqual(envelope.source_type, 'json');
    assert.strictEqual(envelope.file_path, 'david.json');
    assert.deepStrictEqual(envelope.raw_content, { name: 'David' });
    
    // Check ISO timestamp validity
    assert.doesNotThrow(() => {
      new Date(envelope.timestamp).toISOString();
    });
  });

});
