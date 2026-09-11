import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce rapidly changing values (like search input).
 * @param value The value to debounce
 * @param delayMs Delay in milliseconds (default 350ms)
 */
export function useDebounce<T>(value: T, delayMs: number = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
