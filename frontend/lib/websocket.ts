'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

export type WSEvent = {
  event_type: string;
  data: Record<string, unknown>;
  timestamp: string;
};

type EventHandler = (event: WSEvent) => void;

export function useWebSocket(onEvent?: EventHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<EventHandler[]>([]);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  if (onEvent && !handlersRef.current.includes(onEvent)) {
    handlersRef.current.push(onEvent);
  }

  const connect = useCallback(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log('🔴 WS connected');
        // Keep-alive ping every 25s
        const ping = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping');
        }, 25000);
        ws.onclose = () => {
          clearInterval(ping);
          setConnected(false);
          console.log('WS disconnected, reconnecting in 3s...');
          reconnectTimer.current = setTimeout(connect, 3000);
        };
      };

      ws.onmessage = (event) => {
        try {
          const parsed: WSEvent = JSON.parse(event.data);
          handlersRef.current.forEach(h => h(parsed));
        } catch {}
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}
