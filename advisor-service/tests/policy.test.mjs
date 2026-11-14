import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessAvailability, assessEligibility, buildAdvisorResponse, calendarDay, collectCandidates} from '../src/policy.mjs';
import {rows, NOW, HULT, TECHATHON, request} from './helpers.mjs';

const row = id => structuredClone(rows.find(item => item.id === id));

test('historical, upcoming and unknown listings cannot be recommended as open', () => {
  const candidates = collectCandidates(rows, {}, NOW);
  assert.ok(candidates.length > 0);
  for (const candidate of candidates) assert.ok(['open', 'closing_soon'].includes(candidate.row.status));
  for (const item of rows.filter(item => ['closed_historical', 'upcoming', 'unknown'].includes(item.status))) {
    assert.equal(assessAvailability(item, NOW).candidate, false, item.id);
  }
  assert.ok(!candidates.some(item => item.row.id === 'qv-hack-mlh-ghw-builders-week-2026'));
});

test('past deadlines, completed events, stale/future verification and community sources are excluded', () => {
  for (const mutate of [item => { item.dates.deadline = '2026-11-13'; },
    item => { item.dates.eventEnd = '2026-11-13'; },
    item => { item.lastVerifiedAt = '2026-10-01T12:00:00Z'; },
    item => { item.lastVerifiedAt = '2026-12-01T12:00:00Z'; },
    item => { item.uncertainty.availability = true; },
    item => { item.dataSource = 'community'; }]) {
    const item = row(TECHATHON); mutate(item);
    assert.equal(assessAvailability(item, NOW).candidate, false);
  }
});

test('deadline uses its recorded IANA zone, not server or Hong Kong midnight', () => {
  const item = row(TECHATHON);
  item.dates.deadline = '2026-11-13';
  item.dates.deadlineTimezone = 'America/New_York';
  const result = assessAvailability(item, NOW); // 22:00 Nov 13 in New York.
  assert.equal(result.candidate, true);
  assert.equal(result.value.status, 'needs_confirmation');
  assert.equal(calendarDay(NOW, 'America/New_York'), '2026-11-13');
  assert.equal(calendarDay(new Date('2026-11-14T05:00:00Z'), 'America/New_York'), '2026-11-14');
  assert.equal(assessAvailability(item, new Date('2026-11-14T05:00:00Z')).candidate, false);
});

test('exact timestamp expiry is checked at the boundary; date-only never invents a closing time', () => {
  const item = row(TECHATHON);
  item.dates.deadline = '2026-11-14T03:00:00Z';
  assert.equal(assessAvailability(item, NOW).candidate, false);
  item.dates.deadline = '2026-11-14';
  const result = assessAvailability(item, NOW);
  assert.equal(result.candidate, true);
  assert.equal(result.value.status, 'needs_confirmation');
  item.dates.deadlineTimezone = null;
  assert.equal(assessAvailability(item, NOW).value.status, 'needs_confirmation');
});

test('missing deadline is a source uncertainty, never a missing user field', () => {
  const candidates = collectCandidates(rows, request.context, NOW);
  const hult = candidates.find(item => item.row.id === HULT);
  assert.equal(hult.availability.status, 'needs_confirmation');
  assert.deepEqual(hult.eligibility.missingFields, []);
  const reply = buildAdvisorResponse([hult], request.context);
  assert.ok(reply.recommendations[0].availability.reasons.some(reason => /deadline/.test(reason)));
});

test('partial age/team/student checks can reject but never establish complete eligibility', () => {
  const item = row(HULT);
  const good = assessEligibility(item, request.context);
  assert.equal(good.eligibility.status, 'needs_confirmation');
  for (const context of [{...request.context, age: 17}, {...request.context, teamSize: 1}, {...request.context, isStudent: false}]) {
    assert.equal(assessEligibility(item, context).eligibility.status, 'ineligible');
    assert.ok(!collectCandidates([item], context, NOW).length);
  }
  assert.deepEqual(assessEligibility(item, {}).eligibility.missingFields, ['teamSize', 'age', 'isStudent']);
  assert.ok(!good.eligibility.missingFields.includes('hoursPerWeek'));
  assert.ok(!good.eligibility.missingFields.includes('studentYear'));
});

test('age and team boundaries are inclusive except the recorded below-30 rule', () => {
  const health = row('qv-biz-healthnext-challenge-2026-27');
  assert.equal(assessEligibility(health, {age: 29, teamSize: 4, isStudent: true}).eligibility.status, 'needs_confirmation');
  assert.equal(assessEligibility(health, {age: 30, teamSize: 6, isStudent: true}).eligibility.status, 'ineligible');
  const youth = row('qv-startup-youthx-2027');
  for (const age of [18, 25]) assert.equal(assessEligibility(youth, {age, teamSize: 5, isStudent: true}).eligibility.status, 'needs_confirmation');
  for (const age of [17, 26]) assert.equal(assessEligibility(youth, {age, teamSize: 5, isStudent: true}).eligibility.status, 'ineligible');
});

test('changed or uncertain eligibility evidence disables partial rules', () => {
  const item = row(HULT);
  item.eligibilityRawText += ' New participation route.';
  const changed = assessEligibility(item, {age: 12, teamSize: 1});
  assert.equal(changed.eligibility.status, 'needs_confirmation');
  assert.deepEqual(changed.eligibility.missingFields, []);
  const uncertain = row(HULT); uncertain.uncertainty.eligibility = true;
  assert.equal(assessEligibility(uncertain, {age: 12, teamSize: 1}).eligibility.status, 'needs_confirmation');
});

test('solo exceptions and multiple routes are not naively parsed as mandatory team ranges', () => {
  for (const id of ['qv-biz-cbs-global-case-competition-2026', 'qv-hack-hkmu-hackathon-2027', 'qv-hack-iot-data-hackathon-2027']) {
    const result = assessEligibility(row(id), {teamSize: 1, isStudent: false});
    assert.equal(result.eligibility.status, 'needs_confirmation');
    assert.deepEqual(result.eligibility.missingFields, []);
  }
});

test('unknown Techathon fee/rules stay uncertain, with no invented missing team field', () => {
  const candidate = collectCandidates(rows, {preferredCategories: ['hackathon'], hoursPerWeek: 6}, NOW).find(item => item.row.id === TECHATHON);
  const response = buildAdvisorResponse([candidate], {hoursPerWeek: 6});
  assert.deepEqual(response.missingFields, []);
  assert.deepEqual(response.followUpQuestions, []);
  assert.equal(response.recommendations[0].eligibility.status, 'needs_confirmation');
  assert.ok(response.recommendations[0].uncertainties.includes('Participation fee is not confirmed.'));
  assert.ok(response.uncertainties.some(text => /time commitment is not checked/.test(text)));
  assert.doesNotMatch(JSON.stringify(response), /free|beginner-friendly|6 hours/);
});

test('response uses stable keys for recommendations, missing profile and empty selection', () => {
  const candidate = collectCandidates(rows, {preferredCategories: ['startup']}, NOW).find(item => item.row.id === HULT);
  const partial = buildAdvisorResponse([candidate], {}), empty = buildAdvisorResponse([], {});
  assert.deepEqual(Object.keys(partial), Object.keys(empty));
  assert.deepEqual(partial.missingFields, ['teamSize', 'age', 'isStudent']);
  assert.equal(partial.followUpQuestions.length, 3);
  assert.deepEqual(empty.recommendations, []);
  assert.deepEqual(empty.missingFields, []);
  assert.ok(!('eligibility' in partial));
});
