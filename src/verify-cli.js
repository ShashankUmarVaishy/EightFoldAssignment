import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import assert from 'assert';

/**
 * End-to-End Verification Runner for Phase 4 CLI operations.
 */
async function run() {
  console.log('=== STARTING END-TO-END CLI VERIFICATION ===\n');

  const fixturesDir = path.resolve('fixtures');
  await fs.mkdir(fixturesDir, { recursive: true });

  // 1. Create sample source files (ATS JSON & Resume TXT)
  const candidateAts = {
    full_name: 'Shashank Kumar',
    emails: ['shashank@example.com'],
    phones: ['+919876543210'],
    location: { city: 'Delhi', region: 'Delhi', country: 'India' },
    skills: ['JavaScript', 'React', 'NodeJS'],
    experience: [
      {
        company: 'Google LLC',
        title: 'Software Engineer II',
        start: '2024-06',
        end: 'Present',
        summary: 'Working on search models.'
      }
    ]
  };

  const candidateResume = `
  Resume - Shashank Kumar
  Email: shashank@example.com
  Phone: +919876543210
  Skills: Python, TypeScript, React
  Experience:
  Google Inc. | Software Engineer | 2024-01 to 2024-06
  `;

  const pathAts = path.join(fixturesDir, 'candidate_ats.json');
  const pathResume = path.join(fixturesDir, 'candidate_resume.txt');

  await fs.writeFile(pathAts, JSON.stringify(candidateAts, null, 2), 'utf8');
  await fs.writeFile(pathResume, candidateResume, 'utf8');
  console.log('✓ Successfully created candidate source fixtures.');

  // 2. Create config files (Default Flat Config & Custom Nested Config)
  const configDefault = {
    fields: [
      { source_path: 'candidate_id', target_path: 'id', type: 'string' },
      { source_path: 'full_name', target_path: 'name', type: 'string' },
      { source_path: 'emails[0]', target_path: 'primary_email', type: 'string' },
      { source_path: 'location.country', target_path: 'country_code', type: 'string' },
      { source_path: 'skills', target_path: 'skills', type: 'array' }
    ],
    on_missing: 'null'
  };

  const configCustom = {
    fields: [
      { source_path: 'full_name', target_path: 'profile.name', type: 'string' },
      { source_path: 'emails[0]', target_path: 'profile.contacts.email', type: 'string' },
      { source_path: 'phones[0]', target_path: 'profile.contacts.phone', type: 'string' },
      { source_path: 'years_experience', target_path: 'total_experience_years', type: 'number' },
      { source_path: 'overall_confidence', target_path: 'trust_score', type: 'number' }
    ],
    on_missing: 'omit'
  };

  const pathConfigDefault = path.join(fixturesDir, 'config_default.json');
  const pathConfigCustom = path.join(fixturesDir, 'config_custom.json');

  await fs.writeFile(pathConfigDefault, JSON.stringify(configDefault, null, 2), 'utf8');
  await fs.writeFile(pathConfigCustom, JSON.stringify(configCustom, null, 2), 'utf8');
  console.log('✓ Successfully created configuration schema fixtures.');

  // 3. Define output target files
  const pathOutDefault = path.join(fixturesDir, 'output_default.json');
  const pathOutCustom = path.join(fixturesDir, 'output_custom.json');

  // 4. Run CLI commands programmatically
  console.log('\n--> Executing CLI: Ingesting profiles and projecting Default Schema...');
  execSync(`node src/cli.js -i "${pathAts}" "${pathResume}" -c "${pathConfigDefault}" -o "${pathOutDefault}"`);
  console.log('✓ CLI default execution finished.');

  console.log('--> Executing CLI: Ingesting profiles and projecting Custom Schema...');
  execSync(`node src/cli.js -i "${pathAts}" "${pathResume}" -c "${pathConfigCustom}" -o "${pathOutCustom}"`);
  console.log('✓ CLI custom execution finished.');

  // 5. Assert outputs verify correctly (Snapshot Validation)
  const defaultOutContent = await fs.readFile(pathOutDefault, 'utf8');
  const customOutContent = await fs.readFile(pathOutCustom, 'utf8');

  const defaultProfiles = JSON.parse(defaultOutContent);
  const customProfiles = JSON.parse(customOutContent);

  // Assert default schema output matches structure
  assert.strictEqual(defaultProfiles.length, 1, 'Should resolve to exactly 1 candidate profile.');
  const defProfile = defaultProfiles[0];
  assert.ok(defProfile.id, 'id is present.');
  assert.strictEqual(defProfile.name, 'Shashank Kumar');
  assert.strictEqual(defProfile.primary_email, 'shashank@example.com');
  assert.strictEqual(defProfile.country_code, 'IN', 'Country maps to IN.');
  assert.strictEqual(defProfile.skills.length, 5, 'Deduplicated skills list should merge JS/TS/Py/React/Node.js.');

  // Assert custom schema output matches nested structure
  assert.strictEqual(customProfiles.length, 1);
  const custProfile = customProfiles[0];
  assert.strictEqual(custProfile.profile.name, 'Shashank Kumar');
  assert.strictEqual(custProfile.profile.contacts.email, 'shashank@example.com');
  assert.strictEqual(custProfile.profile.contacts.phone, '+919876543210');
  
  // Overlap should merge to 2024-01 to Present (system June 2026) => 29 months + 1 = 30 months = 2.5 years
  assert.strictEqual(custProfile.total_experience_years, 2.5, 'Experience timelines merged and computed correctly.');
  assert.strictEqual(custProfile.trust_score, 0.76, 'Overall confidence has the expected harmony penalty applied.');

  console.log('\n=============================================');
  console.log('✓ ALL END-TO-END CLI VERIFICATION TESTS PASS!');
  console.log('=============================================\n');
}

run().catch(err => {
  console.error('[ERROR] E2E Verification failed:', err);
  process.exit(1);
});
