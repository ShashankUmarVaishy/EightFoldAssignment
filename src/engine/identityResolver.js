import { normalizeName } from '../normalizers/nameNormalizer.js';
import { normalizeEmails } from '../normalizers/emailNormalizer.js';
import { normalizePhones } from '../normalizers/phoneNormalizer.js';
import { normalizeCountry } from '../normalizers/countryNormalizer.js';
import { normalizeDate } from '../normalizers/dateNormalizer.js';
import { uuidv5 } from './uuid.js';

/**
 * Normalizes an raw envelope content.
 */
export function normalizeEnvelope(envelope) {
  const rc = envelope.raw_content;
  const sourceType = envelope.source_type;

  let name = '';
  let emails = [];
  let phones = [];
  let country = null;
  let city = '';
  let region = '';
  const links = { linkedin: null, github: null, portfolio: null, other: [] };
  let skills = [];
  let experience = [];

  if (typeof rc === 'string') {
    // Unstructured text extraction
    const emailMatches = rc.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    emails = normalizeEmails(emailMatches);

    const phoneMatches = rc.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\+\d{10,12}/g) || [];
    phones = normalizePhones(phoneMatches);

    const lines = rc.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const firstLineClean = lines[0].replace(/resume/i, '').replace(/[-:]/g, '').trim();
      name = normalizeName(firstLineClean);
    }

    const urlMatches = rc.match(/https?:\/\/[^\s$.?#].[^\s]*/g) || [];
    for (const url of urlMatches) {
      const cleanUrl = url.replace(/[.,:;]$/, '');
      if (cleanUrl.includes('linkedin.com')) {
        links.linkedin = cleanUrl;
      } else if (cleanUrl.includes('github.com')) {
        links.github = cleanUrl;
      } else if (cleanUrl.includes('portfolio') || cleanUrl.includes('personal')) {
        links.portfolio = cleanUrl;
      } else {
        links.other.push(cleanUrl);
      }
    }

    const skillsLine = lines.find(l => l.toLowerCase().includes('skills:'));
    if (skillsLine) {
      const list = skillsLine.split(/skills:/i)[1].split(',').map(s => s.trim());
      skills = Array.from(new Set(list.map(s => s.trim().toLowerCase()))).filter(Boolean);
    }

    for (const line of lines) {
      if (line.includes('|')) {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length >= 3) {
          const comp = parts[0];
          const tit = parts[1];
          const dates = parts[2].split(/\s+to\s+|\s+-\s+/i);
          const start = dates[0] ? normalizeDate(dates[0]) : '';
          const end = dates[1] ? normalizeDate(dates[1]) : '';
          experience.push({
            company: comp,
            title: tit,
            start,
            end,
            summary: ''
          });
        }
      }
    }
  } else if (rc && typeof rc === 'object') {
    // Structured object parser (JSON / CSV rows)
    let rawName = '';
    if (rc.full_name) rawName = rc.full_name;
    else if (rc.name) rawName = rc.name;
    else if (rc.first_name || rc.last_name) {
      rawName = `${rc.first_name || ''} ${rc.last_name || ''}`;
    }
    name = normalizeName(rawName);

    let rawEmails = [];
    if (typeof rc.emails === 'string') rawEmails = [rc.emails];
    else if (Array.isArray(rc.emails)) rawEmails = rc.emails;
    else if (rc.email) rawEmails = [rc.email];
    emails = normalizeEmails(rawEmails);

    let rawPhones = [];
    if (typeof rc.phones === 'string') rawPhones = [rc.phones];
    else if (Array.isArray(rc.phones)) rawPhones = rc.phones;
    else if (rc.phone) rawPhones = [rc.phone];
    phones = normalizePhones(rawPhones);

    if (rc.location) {
      if (typeof rc.location === 'string') {
        country = normalizeCountry(rc.location);
        const tokens = rc.location.split(',').map(t => t.trim());
        if (tokens.length >= 3) {
          city = tokens[0];
          region = tokens[1];
        } else if (tokens.length === 2) {
          city = tokens[0];
        }
      } else if (typeof rc.location === 'object') {
        country = normalizeCountry(rc.location.country || '');
        city = rc.location.city || '';
        region = rc.location.region || '';
      }
    }

    let rawLinks = [];
    if (rc.links) {
      if (Array.isArray(rc.links)) rawLinks = rc.links;
      else if (typeof rc.links === 'object') {
        Object.assign(links, rc.links);
      } else if (typeof rc.links === 'string') {
        rawLinks = [rc.links];
      }
    }
    for (const url of rawLinks) {
      if (typeof url !== 'string') continue;
      const l = url.trim();
      if (l.includes('linkedin.com')) {
        links.linkedin = l;
      } else if (l.includes('github.com')) {
        links.github = l;
      } else if (l.includes('portfolio') || l.includes('personal') || l.includes('portfolio.')) {
        links.portfolio = l;
      } else {
        links.other.push(l);
      }
    }

    let rawSkills = [];
    if (Array.isArray(rc.skills)) {
      rawSkills = rc.skills;
    } else if (typeof rc.skills === 'string') {
      rawSkills = rc.skills.split(',').map(s => s.trim());
    }
    skills = Array.from(new Set(rawSkills.map(s => s.trim().toLowerCase()))).filter(Boolean);

    let rawExperience = [];
    if (Array.isArray(rc.experience)) {
      rawExperience = rc.experience;
    }
    experience = rawExperience.map(exp => ({
      company: exp.company || '',
      title: exp.title || '',
      start: normalizeDate(exp.start || ''),
      end: normalizeDate(exp.end || ''),
      summary: exp.summary || ''
    }));
  }

  links.other = Array.from(new Set(links.other)).sort();

  return {
    source_id: envelope.source_id,
    timestamp: envelope.timestamp,
    source_type: sourceType,
    name,
    emails,
    phones,
    location: { city, region, country },
    links,
    skills,
    experience
  };
}

/**
 * Groups normalized records into candidate buckets using strict identity matching rules.
 * 
 * Rules:
 * 1. Two records merge if they share a normalized email.
 * 2. Two records merge if they share a phone and neither has conflicting emails.
 * 3. Phone overlaps between records with conflicting emails trigger an isolation collision flag.
 * 
 * @param {Array<Object>} envelopes - List of raw ingestion envelopes.
 * @returns {Array<Object>} List of candidate groups (each group has records array and status metadata).
 */
export function groupIntoCandidates(envelopes) {
  const normalizedRecords = envelopes.map(env => normalizeEnvelope(env));
  
  // Array of candidate buckets: { records: [...], emails: Set, phones: Set, has_phone_collision: false }
  const buckets = [];

  for (const record of normalizedRecords) {
    const matchingBucketIndices = [];

    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      
      // Check email overlap
      const hasEmailOverlap = record.emails.some(email => bucket.emails.has(email));
      
      // Check phone overlap
      const hasPhoneOverlap = record.phones.some(phone => bucket.phones.has(phone));

      if (hasEmailOverlap) {
        matchingBucketIndices.push(i);
      } else if (hasPhoneOverlap) {
        // Phone overlap exists.
        // We only merge if there is no email conflict.
        // Email conflict means both record and bucket have emails, and they don't overlap.
        const recordHasEmails = record.emails.length > 0;
        const bucketHasEmails = bucket.emails.size > 0;

        if (!recordHasEmails || !bucketHasEmails) {
          matchingBucketIndices.push(i);
        } else {
          // Both have emails but no overlap -> phone collision!
          bucket.has_phone_collision = true;
          // We will also flag the current record's temporary collision status
          record.has_phone_collision = true;
        }
      }
    }

    if (matchingBucketIndices.length === 0) {
      // Create new bucket
      buckets.push({
        records: [record],
        emails: new Set(record.emails),
        phones: new Set(record.phones),
        has_phone_collision: record.has_phone_collision || false
      });
    } else {
      // Merge all matching buckets + current record into the first matching bucket
      const targetIndex = matchingBucketIndices[0];
      const targetBucket = buckets[targetIndex];

      targetBucket.records.push(record);
      record.emails.forEach(e => targetBucket.emails.add(e));
      record.phones.forEach(p => targetBucket.phones.add(p));
      if (record.has_phone_collision) {
        targetBucket.has_phone_collision = true;
      }

      // If multiple buckets matched, merge them into targetBucket and remove duplicates
      for (let k = 1; k < matchingBucketIndices.length; k++) {
        const otherIndex = matchingBucketIndices[k];
        const otherBucket = buckets[otherIndex];
        
        otherBucket.records.forEach(r => targetBucket.records.push(r));
        otherBucket.emails.forEach(e => targetBucket.emails.add(e));
        otherBucket.phones.forEach(p => targetBucket.phones.add(p));
        if (otherBucket.has_phone_collision) {
          targetBucket.has_phone_collision = true;
        }

        // Mark for deletion
        buckets[otherIndex] = null;
      }

      // Filter out null buckets (merged ones)
      // Iterate backwards or filter
    }
  }

  // Clean up null buckets and return list of buckets
  const activeBuckets = buckets.filter(Boolean);

  // Generate candidate_id for each bucket
  return activeBuckets.map(bucket => {
    // Sort emails alphabetically to get primary email deterministically
    const sortedEmails = Array.from(bucket.emails).sort();
    const primaryEmail = sortedEmails[0];
    
    let candidateId;
    if (primaryEmail) {
      candidateId = uuidv5(primaryEmail);
    } else {
      // Fallback: use first phone number
      const sortedPhones = Array.from(bucket.phones).sort();
      const primaryPhone = sortedPhones[0];
      if (primaryPhone) {
        candidateId = uuidv5(primaryPhone);
      } else {
        // Fallback to name hash of the first record
        candidateId = uuidv5(bucket.records[0].name || 'anonymous');
      }
    }

    return {
      candidate_id: candidateId,
      records: bucket.records,
      has_phone_collision: bucket.has_phone_collision || false
    };
  });
}

export default {
  normalizeEnvelope,
  groupIntoCandidates
};
