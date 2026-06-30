import { normalizeDate } from '../normalizers/dateNormalizer.js';

// Synonym map for skill unification
const SKILL_SYNONYMS = {
  'js': 'javascript',
  'javascript': 'javascript',
  'react': 'react',
  'reactjs': 'react',
  'react.js': 'react',
  'node': 'node.js',
  'nodejs': 'node.js',
  'node.js': 'node.js',
  'py': 'python',
  'python': 'python',
  'ts': 'typescript',
  'typescript': 'typescript',
  'golang': 'go',
  'go': 'go'
};

/**
 * Returns the Authority Matrix weight for a source type.
 */
export function getSourceWeight(sourceType) {
  const t = String(sourceType).toLowerCase();
  if (t === 'json') return 0.95; // Tier 1
  if (t === 'pdf') return 0.85;  // Tier 2
  if (t === 'github' || t === 'linkedin' || t === 'api') return 0.75; // Tier 3
  if (t === 'txt' || t === 'notes') return 0.50; // Tier 4
  return 0.50; // default fallback
}

/**
 * Utility: Parse YYYY-MM string to numeric components.
 */
function parseYearMonth(str) {
  if (!str) return null;
  const m = str.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  return {
    year: parseInt(m[1], 10),
    month: parseInt(m[2], 10)
  };
}

/**
 * Helper to compute duration in years between two date strings (YYYY-MM).
 * Uses June 2026 as current system date for 'Present' fallback.
 */
export function calculateDurationInYears(start, end) {
  if (!start) return 0;
  const startDate = parseYearMonth(start);
  if (!startDate) return 0;
  
  let endDate;
  if (!end || end === 'Present') {
    // Current system date per environment local time
    endDate = { year: 2026, month: 6 };
  } else {
    endDate = parseYearMonth(end);
  }
  
  if (!endDate) return 0;
  
  const diffMonths = (endDate.year - startDate.year) * 12 + (endDate.month - startDate.month);
  // Add 1 month to include starting month (e.g. 2020-01 to 2020-01 is 1 month)
  const years = Math.max(0, (diffMonths + 1) / 12);
  return Math.round(years * 10) / 10;
}

/**
 * Merges overlapping experience date ranges for the same company.
 * 
 * @param {Array<Object>} experiences - List of experience objects.
 * @returns {Array<Object>} Merged/deduplicated list of experiences.
 */
export function mergeExperiences(experiences) {
  if (experiences.length === 0) return [];

  // Group by normalized company name (lowercase, stripped common suffixes)
  const groups = {};
  for (const exp of experiences) {
    const canonicalCompany = exp.company.trim().toLowerCase()
      .replace(/\b(inc|co|ltd|corp|llc|gmbh)\b[.]?$/i, '')
      .trim()
      .replace(/[,.]\s*$/, '')
      .trim()
      .replace(/\s+/g, ' ')
      .trim();
    if (!canonicalCompany) continue;
    
    if (!groups[canonicalCompany]) {
      groups[canonicalCompany] = [];
    }
    groups[canonicalCompany].push(exp);
  }

  const merged = [];

  for (const key of Object.keys(groups)) {
    const items = groups[key];
    
    // Sort items by start date (Present is sorted last, null start first)
    items.sort((a, b) => {
      if (!a.start) return -1;
      if (!b.start) return 1;
      return a.start.localeCompare(b.start);
    });

    const companyMerged = [];
    for (const item of items) {
      if (companyMerged.length === 0) {
        companyMerged.push({ ...item });
        continue;
      }

      const last = companyMerged[companyMerged.length - 1];
      
      // Check for overlap
      // Overlap exists if item.start <= last.end or last.end is 'Present'
      const startOverlap = last.end === 'Present' || 
                           (last.end && item.start && item.start <= last.end);

      if (startOverlap) {
        // Merge end date: maximum of last.end and item.end
        if (last.end === 'Present' || item.end === 'Present') {
          last.end = 'Present';
        } else if (item.end && (!last.end || item.end > last.end)) {
          last.end = item.end;
        }
        // Append summary and concatenate titles if different
        if (item.title && last.title !== item.title) {
          last.title = `${last.title} / ${item.title}`;
        }
        if (item.summary) {
          last.summary = last.summary ? `${last.summary}\n${item.summary}` : item.summary;
        }
      } else {
        companyMerged.push({ ...item });
      }
    }
    companyMerged.forEach(item => merged.push(item));
  }

  // Sort merged experiences by start date descending
  return merged.sort((a, b) => {
    if (!a.start) return 1;
    if (!b.start) return -1;
    return b.start.localeCompare(a.start);
  });
}

/**
 * Resolves conflicts and merges records of a single candidate bucket.
 * 
 * @param {string} candidateId - Deterministic UUIDv5 ID.
 * @param {Array<Object>} records - List of normalized records grouped together.
 * @param {boolean} hasPhoneCollision - Whether a phone collision was flagged during identity resolution.
 * @returns {Object} Merged candidate profile.
 */
export function mergeCandidateRecords(candidateId, records, hasPhoneCollision) {
  const profile = {
    candidate_id: candidateId,
    full_name: '',
    emails: [],
    phones: [],
    location: { city: '', region: '', country: null },
    links: { linkedin: null, github: null, portfolio: null, other: [] },
    years_experience: 0,
    skills: [],
    experience: [],
    provenance: [],
    overall_confidence: 1.0
  };

  if (records.length === 0) return profile;

  // Track sources that have provided data for confidence averages
  const winningWeights = {};

  // 1. Merge Name (highest tier wins)
  const nameRecords = records.filter(r => r.name).map(r => ({
    name: r.name,
    weight: getSourceWeight(r.source_type),
    source_id: r.source_id,
    timestamp: r.timestamp
  })).sort((a, b) => b.weight - a.weight || b.timestamp.localeCompare(a.timestamp));

  if (nameRecords.length > 0) {
    const winner = nameRecords[0];
    profile.full_name = winner.name;
    profile.provenance.push({
      field: 'full_name',
      source: winner.source_id,
      method: `authority_matrix_tier_${winner.weight === 0.95 ? 1 : winner.weight === 0.85 ? 2 : winner.weight === 0.75 ? 3 : 4}`
    });
    winningWeights.full_name = winner.weight;
  }

  // 2. Merge Emails (union, sort)
  const uniqueEmails = new Set();
  records.forEach(r => {
    r.emails.forEach(e => {
      uniqueEmails.add(e);
      profile.provenance.push({
        field: 'emails',
        source: r.source_id,
        method: 'array_merge'
      });
    });
  });
  profile.emails = Array.from(uniqueEmails).sort();
  if (profile.emails.length > 0) {
    // winning weight is the max source weight
    winningWeights.emails = Math.max(...records.filter(r => r.emails.length > 0).map(r => getSourceWeight(r.source_type)));
  }

  // 3. Merge Phones (union, sort)
  const uniquePhones = new Set();
  records.forEach(r => {
    r.phones.forEach(p => {
      uniquePhones.add(p);
      profile.provenance.push({
        field: 'phones',
        source: r.source_id,
        method: 'array_merge'
      });
    });
  });
  profile.phones = Array.from(uniquePhones).sort();
  if (profile.phones.length > 0) {
    winningWeights.phones = Math.max(...records.filter(r => r.phones.length > 0).map(r => getSourceWeight(r.source_type)));
  }

  // 4. Merge Location (country resolved by highest weight, then match city/region of winner)
  const locationRecords = records.filter(r => r.location && r.location.country).map(r => ({
    loc: r.location,
    weight: getSourceWeight(r.source_type),
    source_id: r.source_id,
    timestamp: r.timestamp
  })).sort((a, b) => b.weight - a.weight || b.timestamp.localeCompare(a.timestamp));

  if (locationRecords.length > 0) {
    const winner = locationRecords[0];
    profile.location = {
      city: winner.loc.city || '',
      region: winner.loc.region || '',
      country: winner.loc.country
    };
    profile.provenance.push({
      field: 'location',
      source: winner.source_id,
      method: `authority_matrix_tier_${winner.weight === 0.95 ? 1 : winner.weight === 0.85 ? 2 : winner.weight === 0.75 ? 3 : 4}`
    });
    winningWeights.location = winner.weight;
  } else {
    // Check if any source had a partial location (city/region only)
    const partials = records.filter(r => r.location && (r.location.city || r.location.region))
      .sort((a, b) => getSourceWeight(b.source_type) - getSourceWeight(a.source_type));
    if (partials.length > 0) {
      profile.location = {
        city: partials[0].location.city || '',
        region: partials[0].location.region || '',
        country: null
      };
    }
  }

  // 5. Merge Links
  const linkFields = ['linkedin', 'github', 'portfolio'];
  linkFields.forEach(field => {
    const winners = records.filter(r => r.links && r.links[field]).map(r => ({
      val: r.links[field],
      weight: getSourceWeight(r.source_type),
      source_id: r.source_id
    })).sort((a, b) => b.weight - a.weight);
    
    if (winners.length > 0) {
      profile.links[field] = winners[0].val;
      profile.provenance.push({
        field: `links.${field}`,
        source: winners[0].source_id,
        method: 'link_resolution'
      });
    }
  });
  
  // Other links (union, sort)
  const otherLinks = new Set();
  records.forEach(r => {
    if (r.links && r.links.other) {
      r.links.other.forEach(link => {
        otherLinks.add(link);
        profile.provenance.push({
          field: 'links.other',
          source: r.source_id,
          method: 'array_merge'
        });
      });
    }
  });
  profile.links.other = Array.from(otherLinks).sort();

  // 6. Merge Skills (lower-cased, synonym mapped, grouped with confidence)
  // Maps: skillName -> { name, confidence, sources: Set }
  const skillGroups = {};
  records.forEach(r => {
    const rWeight = getSourceWeight(r.source_type);
    r.skills.forEach(rawSkill => {
      const canonical = SKILL_SYNONYMS[rawSkill] || rawSkill;
      if (!skillGroups[canonical]) {
        skillGroups[canonical] = {
          name: canonical,
          confidence: rWeight,
          sources: new Set()
        };
      } else {
        // Confidence is max weight among reporting sources
        if (rWeight > skillGroups[canonical].confidence) {
          skillGroups[canonical].confidence = rWeight;
        }
      }
      skillGroups[canonical].sources.add(r.source_id);
    });
  });

  profile.skills = Object.keys(skillGroups).sort().map(name => {
    const g = skillGroups[name];
    profile.provenance.push({
      field: `skills[${name}]`,
      source: Array.from(g.sources).join(','),
      method: 'skill_synonym_unification'
    });
    return {
      name,
      confidence: g.confidence,
      sources: Array.from(g.sources).sort()
    };
  });

  // 7. Merge Experience (Gather all, de-duplicate/merge overlapping timelines)
  const allExperiences = [];
  records.forEach(r => {
    r.experience.forEach(exp => {
      allExperiences.push({
        ...exp,
        source_id: r.source_id
      });
    });
  });
  
  profile.experience = mergeExperiences(allExperiences).map(exp => {
    const { source_id, ...cleanExp } = exp;
    profile.provenance.push({
      field: `experience[${exp.company}]`,
      source: source_id || 'merged',
      method: 'experience_timeline_deduplication'
    });
    return cleanExp;
  });

  if (profile.experience.length > 0) {
    winningWeights.experience = Math.max(...records.filter(r => r.experience.length > 0).map(r => getSourceWeight(r.source_type)));
  }

  // 8. Years of Experience calculation
  let totalYears = 0;
  profile.experience.forEach(exp => {
    totalYears += calculateDurationInYears(exp.start, exp.end);
  });
  profile.years_experience = Math.round(totalYears * 10) / 10;
  profile.provenance.push({
    field: 'years_experience',
    source: 'computed',
    method: 'computed_duration'
  });

  // 9. Calculate Overall Confidence and Apply Harmony Check
  // w_i represents the tier weights for active fields
  const activeWeights = Object.values(winningWeights);
  let baseConfidence = 1.0;
  if (activeWeights.length > 0) {
    const sum = activeWeights.reduce((acc, val) => acc + val, 0);
    baseConfidence = sum / activeWeights.length;
  }

  // Harmony multipliers
  let cHarmony = 1.0;
  
  // Rule A: Phone overlap boundary collision drops harmony to 0.8
  if (hasPhoneCollision) {
    cHarmony = 0.8;
  }

  // Rule B: Active sources state explicitly contradictory values for key timeline fields
  // 1. Contradictory current_company (latest experience with null or 'Present' end date)
  const currentCompanies = new Set();
  records.forEach(r => {
    if (r.experience && r.experience.length > 0) {
      // Latest experience in this source
      const sorted = [...r.experience].sort((a, b) => {
        if (!a.start) return 1;
        if (!b.start) return -1;
        return b.start.localeCompare(a.start);
      });
      const latest = sorted[0];
      if (latest && (latest.end === 'Present' || !latest.end)) {
        currentCompanies.add(latest.company.trim().toLowerCase());
      }
    }
  });

  if (currentCompanies.size > 1) {
    cHarmony = 0.8;
  }

  // 2. Contradictory years of experience (if source-specific calculations differ by more than 1.0 year)
  const sourceYears = [];
  records.forEach(r => {
    if (r.experience && r.experience.length > 0) {
      const mergedSourceExp = mergeExperiences(r.experience);
      let yExp = 0;
      mergedSourceExp.forEach(e => {
        yExp += calculateDurationInYears(e.start, e.end);
      });
      sourceYears.push(yExp);
    }
  });

  if (sourceYears.length > 1) {
    const minYears = Math.min(...sourceYears);
    const maxYears = Math.max(...sourceYears);
    if (maxYears - minYears > 1.0) {
      cHarmony = 0.8;
    }
  }

  profile.overall_confidence = Math.round(baseConfidence * cHarmony * 100) / 100;

  return profile;
}

export default {
  getSourceWeight,
  calculateDurationInYears,
  mergeExperiences,
  mergeCandidateRecords
};
