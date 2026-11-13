/** Provisional local contract. Replace this category alias with the team's shared type at integration. */
export type OpportunityCategory = 'hackathon' | 'business' | 'startup' | 'research';

export interface PixelWorldProps {
  activeRegion: OpportunityCategory | null;
  highlightedRegions: readonly OpportunityCategory[];
  onRegionSelect: (category: OpportunityCategory | null) => void;
}

export interface RegionDefinition {
  readonly category: OpportunityCategory;
  readonly label: string;
  readonly place: string;
}

export interface PixelWorldHandle {
  update(props: PixelWorldProps): void;
  destroy(): void;
}

export const CATEGORIES: readonly OpportunityCategory[];
export const REGIONS: readonly RegionDefinition[];
export function validateProps(props: PixelWorldProps): void;
export function regionState(props: PixelWorldProps, category: OpportunityCategory): {
  selected: boolean;
  recommended: boolean;
};
export function selectionSummary(props: PixelWorldProps): string;
