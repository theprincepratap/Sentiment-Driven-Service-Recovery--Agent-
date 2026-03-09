'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useWebSocket, WSEvent } from '@/lib/websocket';

type WSContextValue = {
  connected: boolean;
  events: WSEvent[];
  eventCount: number;
  clearCount: () => void;
};

const WSContext = createContext<WSContextValue>({
  connected: false,
  events: [],
  eventCount: 0,
  clearCount: () => {},
});

export function useWebSocketContext() {
  return useContext(WSContext);
}

export default function WSProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<WSEvent[]>([]);
  const [alertCount, setAlertCount] = useState(0);

  const handleEvent = useCallback((event: WSEvent) => {
    setEvents(prev => [event, ...prev].slice(0, 100));
    if (['manager_alert', 'new_ticket', 'escalation'].includes(event.event_type)) {
      setAlertCount(c => c + 1);
    }
  }, []);

  const { connected } = useWebSocket(handleEvent);

  return (
    <WSContext.Provider value={{
      connected,
      events,
      eventCount: alertCount,
      clearCount: () => setAlertCount(0)
    }}>
      {children}
    </WSContext.Provider>
  );
}
