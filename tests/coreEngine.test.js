import test from 'node:test';
import assert from 'node:assert';
import { normalizeName } from '../src/normalizers/nameNormalizer.js';
import { normalizeEmails } from '../src/normalizers/emailNormalizer.js';
import { normalizePhone, normalizePhones } from '../src/normalizers/phoneNormalizer.js';
import { normalizeCountry } from '../src/normalizers/countryNormalizer.js';
import { normalizeDate } from '../src/normalizers/dateNormalizer.js';
import { uuidv5 } from '../src/engine/uuid.js';
import { groupIntoCandidates } from '../src/engine/identityResolver.js';
import { calculateDurationInYears, mergeExperiences, mergeCandidateRecords } from '../src/engine/conflictResolver.js';
import { runEngine } from '../src/engine/index.js';

test('Core Engine Phase 2 Suite', async (t) => {

  await t.test('Name Normalizer', () => {
    assert.strictEqual(normalizeName('  shashank   kumar 123! '), 'Shashank Kumar');
    assert.strictEqual(normalizeName('rené d\'anjou'), 'René Danjou'); // accent chars preserved, punctuation stripped
    assert.strictEqual(normalizeName('jean-luc picard'), 'Jean-luc Picard'); // hyphens preserved
    assert.strictEqual(normalizeName(null), '');
  });

  await t.test('Email Normalizer', () => {
    assert.deepStrictEqual(normalizeEmails(['Bob@Example.com', '  alice@example.com  ', 'invalid-email']), ['alice@example.com', 'bob@example.com']);
    assert.deepStrictEqual(normalizeEmails('single@example.com'), ['single@example.com']);
  });

  await t.test('Phone Normalizer', () => {
    assert.strictEqual(normalizePhone('415-555-2671', 'US'), '+14155552671');
    assert.strictEqual(normalizePhone('+919876543210', 'IN'), '+919876543210');
    assert.strictEqual(normalizePhone('12345'), null); // invalid dropped
  });

  await t.test('Country Normalizer', () => {
    assert.strictEqual(normalizeCountry('United States'), 'US');
    assert.strictEqual(normalizeCountry('USA'), 'US');
    assert.strictEqual(normalizeCountry('San Francisco, CA, United States'), 'US');
    assert.strictEqual(normalizeCountry('London, UK'), 'GB');
    assert.strictEqual(normalizeCountry('unknown country'), null);
  });

  await t.test('Date Normalizer', () => {
    assert.strictEqual(normalizeDate('2020-05-12'), '2020-05');
    assert.strictEqual(normalizeDate('May 2020'), '2020-05');
    assert.strictEqual(normalizeDate('2020 May'), '2020-05');
    assert.strictEqual(normalizeDate('2020'), '2020-01');
    assert.strictEqual(normalizeDate('Present'), 'Present');
    assert.strictEqual(normalizeDate('invalid-date'), null);
  });

  await t.test('Deterministic UUIDv5 Helper', () => {
    const id1 = uuidv5('test@example.com');
    const id2 = uuidv5('test@example.com');
    const idDiff = uuidv5('diff@example.com');
    
    assert.strictEqual(id1, id2);
    assert.notStrictEqual(id1, idDiff);
    assert.match(id1, /^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/); // uuid v5 regex check
  });

  await t.test('Identity Resolution - Grouping Rules', () => {
    // Envelope list representing multiple files:
    const envs = [
      {
        source_id: 'src1',
        source_type: 'json',
        timestamp: '2026-06-30T10:00:00Z',
        raw_content: { name: 'Alice Smith', email: 'alice@example.com', phone: '+14155550001' }
      },
      {
        source_id: 'src2',
        source_type: 'pdf',
        timestamp: '2026-06-30T10:05:00Z',
        raw_content: { name: 'Alice S.', email: 'alice@example.com', links: ['https://github.com/alice'] }
      },
      {
        // Record with phone but no email: should merge with Alice via phone
        source_id: 'src3',
        source_type: 'txt',
        timestamp: '2026-06-30T10:10:00Z',
        raw_content: { phone: '+14155550001', location: 'San Francisco, CA' }
      },
      {
        // Record with conflicting email but matching phone: must remain isolated candidate, flag collision
        source_id: 'src4',
        source_type: 'json',
        timestamp: '2026-06-30T10:15:00Z',
        raw_content: { name: 'Bob Collision', email: 'bob@example.com', phone: '+14155550001' }
      },
      {
        // Record with same name but completely different contacts: should remain distinct
        source_id: 'src5',
        source_type: 'json',
        timestamp: '2026-06-30T10:20:00Z',
        raw_content: { name: 'Alice Smith', email: 'alice.other@example.com' }
      }
    ];

    const candidates = groupIntoCandidates(envs);
    
    // Total distinct candidates should be 3:
    // 1. Alice (src1 + src2 + src3)
    // 2. Bob Collision (src4) - has_phone_collision: true
    // 3. Alice Other (src5)
    assert.strictEqual(candidates.length, 3);
    
    const aliceGroup = candidates.find(c => c.records.some(r => r.emails.includes('alice@example.com')));
    assert.ok(aliceGroup);
    assert.strictEqual(aliceGroup.records.length, 3);
    
    const bobGroup = candidates.find(c => c.records.some(r => r.emails.includes('bob@example.com')));
    assert.ok(bobGroup);
    assert.strictEqual(bobGroup.records.length, 1);
    assert.strictEqual(bobGroup.has_phone_collision, true);

    const otherAliceGroup = candidates.find(c => c.records.some(r => r.emails.includes('alice.other@example.com')));
    assert.ok(otherAliceGroup);
    assert.strictEqual(otherAliceGroup.records.length, 1);
  });

  await t.test('Merging Loop - Conflict Resolution & Weights', () => {
    // ATS Json (Tier 1: 0.95) conflicting with Note (Tier 4: 0.50)
    const records = [
      {
        source_id: 'note-src',
        source_type: 'txt',
        timestamp: '2026-06-30T12:00:00Z',
        name: 'Alice S.',
        emails: ['alice@example.com'],
        phones: ['+14155550001'],
        location: { city: 'SF', region: 'CA', country: 'US' },
        links: { linkedin: null, github: null, portfolio: null, other: [] },
        skills: ['js', 'css'],
        experience: []
      },
      {
        source_id: 'ats-src',
        source_type: 'json',
        timestamp: '2026-06-30T12:05:00Z',
        name: 'Alice Smith',
        emails: ['alice@example.com'],
        phones: [],
        location: { city: 'San Francisco', region: 'California', country: 'US' },
        links: { linkedin: 'https://linkedin.com/in/alice', github: null, portfolio: null, other: [] },
        skills: ['javascript', 'react'],
        experience: []
      }
    ];

    const merged = mergeCandidateRecords('alice-id', records, false);

    // ATS name "Alice Smith" should win over note name "Alice S."
    assert.strictEqual(merged.full_name, 'Alice Smith');
    // ATS links.linkedin should win
    assert.strictEqual(merged.links.linkedin, 'https://linkedin.com/in/alice');
    // location details of the ATS record (country winner) should win
    assert.strictEqual(merged.location.city, 'San Francisco');
    
    // Skills should be merged and unified via synonyms (js -> javascript)
    const skillNames = merged.skills.map(s => s.name);
    assert.deepStrictEqual(skillNames, ['css', 'javascript', 'react']);
    
    // Check provenance logs
    const nameProvenance = merged.provenance.find(p => p.field === 'full_name');
    assert.strictEqual(nameProvenance.source, 'ats-src');
    assert.strictEqual(nameProvenance.method, 'authority_matrix_tier_1');
  });

  await t.test('Harmony Check - Penalty drop to 0.8', () => {
    // Case 1: Contradictory current_company (Company A vs Company B)
    const records = [
      {
        source_id: 'src1',
        source_type: 'json',
        timestamp: '2026-06-30T10:00:00Z',
        name: 'Alice',
        emails: ['alice@example.com'],
        phones: [],
        location: { city: '', region: '', country: null },
        links: { linkedin: null, github: null, portfolio: null, other: [] },
        skills: [],
        experience: [
          { company: 'Google', title: 'SWE', start: '2025-01', end: 'Present', summary: '' }
        ]
      },
      {
        source_id: 'src2',
        source_type: 'pdf',
        timestamp: '2026-06-30T10:05:00Z',
        name: 'Alice',
        emails: ['alice@example.com'],
        phones: [],
        location: { city: '', region: '', country: null },
        links: { linkedin: null, github: null, portfolio: null, other: [] },
        skills: [],
        experience: [
          { company: 'Meta', title: 'SWE', start: '2025-06', end: 'Present', summary: '' }
        ]
      }
    ];

    const merged = mergeCandidateRecords('alice-id', records, false);
    // Google vs Meta is contradictory (both Present / no end date)
    // Overall confidence should apply 0.80 multiplier
    // Base confidence is average of JSON (0.95) and PDF (0.85) = 0.90
    // With penalty: 0.95 * 0.80 = 0.76
    assert.strictEqual(merged.overall_confidence, 0.76);
  });

  await t.test('Experience Timeline Deduplication', () => {
    const experiences = [
      { company: 'Google Inc.', title: 'SWE II', start: '2020-01', end: '2021-12', summary: 'Wrote code.' },
      { company: 'Google LLC', title: 'SWE III', start: '2021-06', end: '2023-01', summary: 'Led teams.' }
    ];

    // Google Inc and Google LLC map to 'google' canonical name.
    // They overlap (2020-01 to 2021-12 and 2021-06 to 2023-01).
    // Merged timeline should be: 2020-01 to 2023-01.
    const mergedExp = mergeExperiences(experiences);
    assert.strictEqual(mergedExp.length, 1);
    assert.strictEqual(mergedExp[0].start, '2020-01');
    assert.strictEqual(mergedExp[0].end, '2023-01');
  });

  await t.test('Duration Calculation', () => {
    // 2020-01 to 2020-12: 12 months = 1.0 year (rounded)
    // Since we add 1 month: diff is 11 months + 1 = 12 months.
    assert.strictEqual(calculateDurationInYears('2020-01', '2020-12'), 1.0);
    // 2025-01 to Present (system is June 2026): 18 months = 1.5 years
    assert.strictEqual(calculateDurationInYears('2025-01', 'Present'), 1.5);
  });

  await t.test('End-to-End runEngine API', async () => {
    const rawEnvelopes = [
      {
        source_id: 'env-ats',
        source_type: 'json',
        timestamp: '2026-06-30T12:00:00Z',
        raw_content: {
          name: 'Shashank Kumar',
          email: 'shashank@example.com',
          location: 'US',
          skills: 'js, Node.js'
        }
      }
    ];

    const results = runEngine(rawEnvelopes);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].full_name, 'Shashank Kumar');
    assert.strictEqual(results[0].location.country, 'US');
    assert.deepStrictEqual(results[0].skills.map(s => s.name), ['javascript', 'node.js']);
  });

});
