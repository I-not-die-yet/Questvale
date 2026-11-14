import {decisionReasons} from './decision-evidence.mjs';
import {LIMITS} from './contract.mjs';
import {isDateOnly, isInstant, validTimeZone} from './dataset.mjs';

// Partial rules are tied to exact recorded evidence. They are NOT complete
// eligibility specifications, and they never yield an overall `eligible` result.
// Changed evidence disables the rule rather than silently reusing stale checks.
const PARTIAL_RULES = new Map([
  ['qv-biz-healthnext-challenge-2026-27', {
    evidence: 'Tertiary students aged below 30 in Hong Kong. Teams of 4-6 from the same or different institutions. Students from all disciplines are welcome. No healthcare or business background required.',
    teamSize: [4, 6], age: [0, 29], student: true,
  }],
  ['qv-startup-hult-prize-2027', {
    evidence: 'Teams of 2-4 students from almost every country in the world who are at least 18 years of age and enrolled in any degree-granting program (including undergraduate and graduate programs) at the time of registration. Pitching a for-profit business that directly supports at least one UN Sustainable Development Goal (SDG).',
    teamSize: [2, 4], age: [18, 120], student: true,
  }],
  ['qv-startup-youthx-2027', {
    evidence: 'Student teams (aged 18-25, 3-5 members from the same university) build and test ideas across three tracks: Technology & AI, Sustainability & Climate, Health, Wellbeing & Social Innovation.',
    teamSize: [3, 5], age: [18, 25], student: true,
  }],
]);

export function calendarDay(now, zone) {
  if (!validTimeZone(zone)) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = type => parts.find(item => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function dateRelation(value, zone, now) {
  if (isInstant(value)) return Date.parse(value) <= now.getTime() ? 'past' : 'future';
  if (!isDateOnly(value)) return 'unknown';
  const today = calendarDay(now, zone);
  if (!today) return 'unknown';
  return value < today ? 'past' : value === today ? 'today' : 'future';
}

export function assessAvailability(row, now) {
  const exclude = reason => ({candidate: false, value: {status: 'needs_confirmation', reasons: [reason]}});
  if (!['open', 'closing_soon'].includes(row.status)) return exclude('The listing is not recorded as open for applications.');
  if (row.dataSource === 'community') return exclude('Community material is not application-status evidence.');
  const verified = Date.parse(row.lastVerifiedAt);
  const age = now.getTime() - verified;
  if (!Number.isFinite(age) || age < 0 || age > LIMITS.sourceMaxAgeDays * 86400000) {
    return exclude('The recorded source check is stale or has an invalid verification time.');
  }
  if (row.uncertainty.availability) return exclude('The draft explicitly marks application availability as uncertain.');
  const deadline = dateRelation(row.dates.deadline, row.dates.deadlineTimezone, now);
  const ended = dateRelation(row.dates.eventEnd, row.dates.deadlineTimezone, now);
  if (deadline === 'past') return exclude('The recorded application deadline has passed.');
  if (ended === 'past') return exclude('The recorded event end has passed.');
  const reasons = ['The imported draft lists applications as open; this service has not rechecked the source.'];
  const uncertain = row.uncertainty.deadline || ['unknown', 'today'].includes(deadline);
  if (deadline === 'unknown') reasons.push('The application deadline or its time zone is not confirmed.');
  if (deadline === 'today') reasons.push('The deadline date is today in its recorded time zone; the exact closing time is not encoded.');
  if (row.uncertainty.deadline) reasons.push('The draft marks the deadline as uncertain.');
  return {candidate: true, value: {status: uncertain ? 'needs_confirmation' : 'listed_open', reasons}};
}

export function assessEligibility(row, context) {
  const reasons = [], missingFields = [], uncertainties = [];
  const rule = PARTIAL_RULES.get(row.id);
  const usable = rule && rule.evidence === row.eligibilityRawText && !row.uncertainty.eligibility;
  let failed = false;
  if (usable) {
    for (const field of ['teamSize', 'age']) {
      const value = context[field];
      if (value === null || value === undefined) { missingFields.push(field); continue; }
      const [min, max] = rule[field];
      if (value < min || value > max) {
        failed = true;
        reasons.push(field === 'teamSize' ?
          `The stated team size is outside the recorded range of ${min}-${max}.` :
          'Your stated age does not meet the recorded age requirement.');
      } else {
        reasons.push(field === 'teamSize' ? 'The stated team size meets the checked size rule.' :
          'Your stated age meets the checked age rule; teammates have not been checked.');
      }
    }
    if (context.isStudent == null) missingFields.push('isStudent');
    else if (rule.student && context.isStudent === false) {
      failed = true;
      reasons.push('The recorded participation route requires current students.');
    } else reasons.push('You have stated that you are a current student; enrolment details have not been checked.');
  }
  if (row.uncertainty.eligibility) uncertainties.push('The draft marks the activity eligibility rules as uncertain.');
  if (rule && !usable && !row.uncertainty.eligibility) uncertainties.push('Recorded eligibility evidence changed; the associated partial checks are disabled.');
  uncertainties.push('Full eligibility is not encoded. Institution, participation route, all team members and other recorded requirements need human confirmation.');
  if (!failed) reasons.push('The available checks do not establish full eligibility.');
  return {eligibility: {status: failed ? 'ineligible' : 'needs_confirmation', reasons, missingFields}, uncertainties};
}

export function collectCandidates(rows, context, now) {
  return rows.flatMap(row => {
    if (context.preferredCategories?.length && !context.preferredCategories.includes(row.category)) return [];
    const availability = assessAvailability(row, now);
    if (!availability.candidate) return [];
    const assessment = assessEligibility(row, context);
    if (assessment.eligibility.status === 'ineligible') return [];
    return [{row, availability: availability.value, ...assessment}];
  });
}

const QUESTIONS = {
  teamSize: 'How many people, including you, are in your team?',
  age: 'What is your age in completed years?',
  isStudent: 'Are you currently enrolled as a student?',
};

export function buildAdvisorResponse(selected, context) {
  const missingFields = [...new Set(selected.flatMap(candidate => candidate.eligibility.missingFields))];
  const uncertainties = ['Recommendations use an imported draft; sources have not been rechecked by this service.'];
  uncertainties.push('Selection order is not an overall ranking. Skills and live team recruitment are not assessed by this Advisor.');
  if (context.hoursPerWeek != null) uncertainties.push('Weekly time commitment is not checked by this version.');
  const recommendations = selected.map(({row, availability, eligibility, uncertainties: gaps}) => ({
    opportunityId: row.id,
    availability,
    eligibility,
    reasons: [context.preferredCategories?.includes(row.category) ?
      `The recorded category matches your stated preference: ${row.category}.` :
      'Selected from the recorded listings for further checking; this is not an eligibility or suitability guarantee.',
      ...decisionReasons(row, selected)],
    uncertainties: [
      ...gaps,
      ...(row.fee.amount == null ? ['Participation fee is not confirmed.'] : []),
      ...(row.uncertainty.fee ? ['The draft marks fee information as uncertain.'] : []),
      'Beginner suitability and weekly workload have not been assessed.',
    ],
    officialUrl: row.officialUrl,
    sourceUrl: row.sourceUrl,
    lastVerifiedAt: row.lastVerifiedAt,
  }));
  return {
    message: selected.length ? 'These recorded opportunities may be worth checking. Review eligibility and availability separately.' :
      'No recommendations were returned. This does not establish that no suitable opportunities exist.',
    recommendations,
    missingFields,
    uncertainties,
    followUpQuestions: missingFields.length ? missingFields.map(field => QUESTIONS[field]).slice(0, 3) :
      selected.length ? [] : ['Would you like to change your preferred categories?'],
  };
}
