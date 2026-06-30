import { groupIntoCandidates } from './identityResolver.js';
import { mergeCandidateRecords } from './conflictResolver.js';

/**
 * Executes the core transformation engine over a list of ingested envelopes.
 * Groups records into identities, resolves conflicts, and outputs canonical candidate profiles.
 * 
 * @param {Array<Object>} envelopes - List of ingested and envelope-wrapped records.
 * @returns {Array<Object>} Canonical resolved candidates.
 */
export function runEngine(envelopes) {
  if (!Array.isArray(envelopes) || envelopes.length === 0) {
    return [];
  }

  const candidateBuckets = groupIntoCandidates(envelopes);
  
  return candidateBuckets.map(bucket => {
    return mergeCandidateRecords(
      bucket.candidate_id,
      bucket.records,
      bucket.has_phone_collision
    );
  });
}

export default {
  runEngine
};
