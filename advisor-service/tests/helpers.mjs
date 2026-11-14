import {loadDataset} from '../src/dataset.mjs';
import {createAdvisorServer} from '../src/server.mjs';

export const rows = await loadDataset(process.env.QUESTVALE_DATA_FILE || new URL('../../questvale-data-draft/opportunities.json', import.meta.url));
export const NOW = new Date('2026-11-14T11:00:00+08:00');
export const HULT = 'qv-startup-hult-prize-2027';
export const TECHATHON = 'qv-hack-techathon-plus-2027';
export const request = {message: 'Show startup opportunities.', context: {
  preferredCategories: ['startup'], age: 20, teamSize: 3, isStudent: true, hoursPerWeek: 6,
}};

export function mockSelection(ids = [HULT]) {
  const calls = [];
  return {calls, async select(payload) { calls.push(payload); return {opportunityIds: [...ids]}; }};
}

export async function start(t, options = {}) {
  const server = createAdvisorServer({rows, clock: () => NOW, ...options});
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {server, base, post: (body = request, init = {}) => fetch(base + '/api/advisor', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), ...init,
  })};
}
