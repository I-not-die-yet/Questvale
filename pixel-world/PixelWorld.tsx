'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { PixelWorldHandle, PixelWorldProps } from './contract.mjs';
import { createPixelWorld } from './pixel-world.mjs';

// Effects never run on the server; the map is mounted only in the browser.
const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Thin optional React adapter. Import pixel-world.css once in the host application's allowed CSS entry. */
export function PixelWorld({ activeRegion, highlightedRegions, onRegionSelect }: PixelWorldProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<PixelWorldHandle | null>(null);

  // Reconcile after every committed render so updates cannot be lost, including immediately after mount.
  useClientLayoutEffect(() => {
    const props = { activeRegion, highlightedRegions, onRegionSelect };
    if (!viewRef.current && hostRef.current) {
      viewRef.current = createPixelWorld(hostRef.current, props);
    } else {
      viewRef.current?.update(props);
    }
  });

  useClientLayoutEffect(() => () => {
    viewRef.current?.destroy();
    viewRef.current = null;
  }, []);

  return <div ref={hostRef} />;
}

export type { OpportunityCategory, PixelWorldProps } from './contract.mjs';
