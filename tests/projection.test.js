import test from 'node:test';
import assert from 'node:assert';
import { projectRecord, projectRecords, buildZodSchema } from '../src/projector/projectionLayer.js';
import logger from '../src/utils/logger.js';

// Mute console logs during testing
const originalError = console.error;

function muteConsole() {
  console.error = () => {};
}

function restoreConsole() {
  console.error = originalError;
}

test('Projection Layer Phase 3 Suite', async (t) => {

  muteConsole();
  t.after(() => {
    restoreConsole();
  });

  const sampleRecord = {
    candidate_id: 'uuid-12345',
    full_name: 'Alice Smith',
    emails: ['alice@example.com', 'asmith@work.com'],
    phones: ['+14155552671'],
    location: { city: 'San Francisco', region: 'CA', country: 'US' },
    years_experience: 5.4,
    skills: [
      { name: 'javascript', confidence: 0.95 },
      { name: 'react', confidence: 0.85 }
    ]
  };

  await t.test('Path Renaming & Pruning', () => {
    const config = {
      fields: [
        { source_path: 'candidate_id', target_path: 'id', type: 'string' },
        { source_path: 'full_name', target_path: 'name', type: 'string' },
        { source_path: 'emails[0]', target_path: 'contact.email', type: 'string' },
        { source_path: 'location.country', target_path: 'contact.country', type: 'string' },
        { source_path: 'years_experience', target_path: 'experience_years', type: 'number' }
      ],
      on_missing: 'omit'
    };

    const result = projectRecord(sampleRecord, config);

    assert.strictEqual(result.id, 'uuid-12345');
    assert.strictEqual(result.name, 'Alice Smith');
    assert.strictEqual(result.contact.email, 'alice@example.com');
    assert.strictEqual(result.contact.country, 'US');
    assert.strictEqual(result.experience_years, 5.4);
    // Skills should be pruned since they are not in the configuration fields
    assert.strictEqual(result.skills, undefined);
  });

  await t.test('Missing Values - Omit Policy', () => {
    const config = {
      fields: [
        { source_path: 'full_name', target_path: 'name', type: 'string' },
        { source_path: 'non_existent_field', target_path: 'missing_val', type: 'string' }
      ],
      on_missing: 'omit'
    };

    const result = projectRecord(sampleRecord, config);
    assert.strictEqual(result.name, 'Alice Smith');
    assert.strictEqual('missing_val' in result, false);
  });

  await t.test('Missing Values - Null Policy', () => {
    const config = {
      fields: [
        { source_path: 'full_name', target_path: 'name', type: 'string' },
        { source_path: 'non_existent_field', target_path: 'missing_val', type: 'string' }
      ],
      on_missing: 'null'
    };

    const result = projectRecord(sampleRecord, config);
    assert.strictEqual(result.name, 'Alice Smith');
    assert.strictEqual(result.missing_val, null);
  });

  await t.test('Missing Values - Error Policy', () => {
    const config = {
      fields: [
        { source_path: 'full_name', target_path: 'name', type: 'string' },
        { source_path: 'non_existent_field', target_path: 'missing_val', type: 'string' }
      ],
      on_missing: 'error'
    };

    assert.throws(() => {
      projectRecord(sampleRecord, config);
    }, /Missing required field/);
  });

  await t.test('Dynamic Zod Constraints Validation', () => {
    // Type mismatch: config says 'years_experience' is boolean, but it is number
    const config = {
      fields: [
        { source_path: 'years_experience', target_path: 'exp', type: 'boolean' }
      ],
      on_missing: 'omit'
    };

    assert.throws(() => {
      projectRecord(sampleRecord, config);
    }, /Schema compliance failure/);
  });

  await t.test('Dynamic Array and Object Type validations', () => {
    const config = {
      fields: [
        { source_path: 'skills', target_path: 'skillsList', type: 'array' },
        { source_path: 'location', target_path: 'locObj', type: 'object' }
      ],
      on_missing: 'omit'
    };

    const result = projectRecord(sampleRecord, config);
    assert.deepStrictEqual(result.skillsList, sampleRecord.skills);
    assert.deepStrictEqual(result.locObj, sampleRecord.location);
  });

  await t.test('Bulk Records Projection (JSON Stringifier)', () => {
    const config = {
      fields: [
        { source_path: 'full_name', target_path: 'name', type: 'string' }
      ],
      on_missing: 'omit'
    };

    const json = projectRecords([sampleRecord], config);
    const parsed = JSON.parse(json);
    
    assert.strictEqual(Array.isArray(parsed), true);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].name, 'Alice Smith');
  });

});
