/** @typedef {import('./contract.mjs').PixelWorldProps} PixelWorldProps */

export const REGIONS = Object.freeze([
  Object.freeze({ category: 'hackathon', label: 'Hackathon', place: 'Maker workshop' }),
  Object.freeze({ category: 'business', label: 'Business', place: 'Exchange hall' }),
  Object.freeze({ category: 'startup', label: 'Startup', place: 'Launch studio' }),
  Object.freeze({ category: 'research', label: 'Research', place: 'Observatory' }),
]);

export const CATEGORIES = Object.freeze(REGIONS.map(({ category }) => category));

/** Reject invalid incoming state rather than silently translating a team schema mismatch. */
export function validateProps(props) {
  if (!props || (props.activeRegion !== null && !CATEGORIES.includes(props.activeRegion))) {
    throw new TypeError('activeRegion must be a supported category or null.');
  }
  if (!Array.isArray(props.highlightedRegions) ||
      props.highlightedRegions.some((category) => !CATEGORIES.includes(category))) {
    throw new TypeError('highlightedRegions must contain supported categories only.');
  }
  if (typeof props.onRegionSelect !== 'function') {
    throw new TypeError('onRegionSelect must be a function.');
  }
}

export function regionState(props, category) {
  return {
    selected: props.activeRegion === category,
    recommended: props.highlightedRegions.includes(category),
  };
}

export function selectionSummary(props) {
  const selected = REGIONS.find(({ category }) => category === props.activeRegion)?.label;
  const recommended = REGIONS.filter(({ category }) => props.highlightedRegions.includes(category))
    .map(({ label }) => label);
  return `Selected: ${selected ?? 'All categories'}. Recommended: ${recommended.join(', ') || 'None'}.`;
}
