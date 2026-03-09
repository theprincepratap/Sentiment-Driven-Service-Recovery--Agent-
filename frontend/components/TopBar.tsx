"use client";
import { useEffect, useState } from "react";

interface Props {
  title: string;
  subtitle: string;
}

export default function TopBar({ title, subtitle }: Props) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws");
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    return () => ws.close();
  }, []);

  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
        <span className="text-xs text-gray-400">{connected ? "Live" : "Offline"}</span>
      </div>
    </div>
  );
}