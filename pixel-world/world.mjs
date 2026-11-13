export const WORLD = Object.freeze({ width: 2560, height: 1920, spawn: { x: 1280, y: 1010 }, speed: 105 });
export const PLACES = Object.freeze([
  { category: 'hackathon', label: 'Hackathon', place: 'Maker workshop', x: 490, y: 440 },
  { category: 'business', label: 'Business', place: 'Exchange hall', x: 1890, y: 440 },
  { category: 'startup', label: 'Startup', place: 'Prototype studio', x: 490, y: 1400 },
  { category: 'research', label: 'Research', place: 'Observatory', x: 1890, y: 1400 },
]);
export const BOARD = Object.freeze({ category: null, label: 'All opportunities', x: 1280, y: 925 });
export const door = p => ({ x: p.x + 80, y: p.y + 140 });
export function blocked(x, y) {
  return x < 42 || y < 42 || x > WORLD.width - 42 || y > WORLD.height - 42 ||
    PLACES.some(p => x > p.x - 5 && x < p.x + 165 && y > p.y + 22 && y < p.y + 130) ||
    (x > BOARD.x - 30 && x < BOARD.x + 30 && y > BOARD.y - 18 && y < BOARD.y + 5);
}
export function move(player, input, seconds) {
  const n = Math.hypot(input.x, input.y) || 1;
  const d = WORLD.speed * Math.min(seconds, 0.05);
  const x = player.x + input.x / n * d, y = player.y + input.y / n * d;
  return { x: blocked(x, player.y) ? player.x : x, y: blocked(blocked(x, player.y) ? player.x : x, y) ? player.y : y };
}
export function nearby(player) {
  return [...PLACES.map(p => ({ ...p, ...door(p) })), { ...BOARD, y: BOARD.y + 24 }]
    .find(p => Math.hypot(p.x - player.x, p.y - player.y) < 42) ?? null;
}
export function cameraAt(player, width, height) {
  return { x: Math.max(0, Math.min(WORLD.width - width, player.x - width / 2)), y: Math.max(0, Math.min(WORLD.height - height, player.y - height / 2)) };
}
