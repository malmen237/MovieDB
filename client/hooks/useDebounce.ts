import { useState, useEffect } from 'react';

const DEBOUNCE_DELAY_MS = 300;

export function useDebounce<T>(value: T, delay: number = DEBOUNCE_DELAY_MS): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
