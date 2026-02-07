import { useState, useEffect, useRef } from 'react';
import type { EnrichEvent } from '../../shared/types';

export function useEnrichmentStream(onDone: () => void) {
  const [enrichStatus, setEnrichStatus] = useState<EnrichEvent | null>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    const eventSource = new EventSource('/api/enrich/stream');
    eventSource.onmessage = (e) => {
      const event: EnrichEvent = JSON.parse(e.data);
      setEnrichStatus(event);
      if (event.type === 'done') {
        onDoneRef.current();
      }
    };
    return () => eventSource.close();
  }, []);

  return enrichStatus;
}
