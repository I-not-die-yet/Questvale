import { createPixelWorld } from './pixel-world.mjs';
let activeRegion = null;
const highlightedRegions = [];
const view = createPixelWorld(document.querySelector('#world'), {
  activeRegion, highlightedRegions,
  onRegionSelect(category) {
    activeRegion = category;
    view.update({ activeRegion, highlightedRegions, onRegionSelect: this.onRegionSelect });
  },
});
