import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };
    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } else {
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
  }, [query, matches]);

  return matches;
}

export function useBreakpoint() {
  const isXl = useMediaQuery('(min-width: 1201px)');
  const isLg = useMediaQuery('(min-width: 1025px) and (max-width: 1200px)');
  const isMd = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isSm = useMediaQuery('(min-width: 601px) and (max-width: 768px)');
  const isXs = useMediaQuery('(max-width: 600px)');

  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');

  return {
    isXl,
    isLg,
    isMd,
    isSm,
    isXs,
    isMobile,
    isTablet,
    isDesktop,
  };
}
