import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSeverityLabel(severity: number): string {
  const labels: Record<number, string> = {
    1: 'Minor', 2: 'Low', 3: 'Moderate', 4: 'High', 5: 'Critical'
  };
  return labels[severity] || 'Unknown';
}

export function getSeverityColor(severity: number): string {
  const colors: Record<number, string> = {
    1: '#10b981', 2: '#06b6d4', 3: '#f59e0b', 4: '#ef4444', 5: '#8b5cf6'
  };
  return colors[severity] || '#8da0b8';
}

export function getSentimentColor(sentiment: string): string {
  const map: Record<string, string> = {
    Positive: '#10b981',
    Negative: '#ef4444',
    Neutral: '#f59e0b'
  };
  return map[sentiment] || '#8da0b8';
}

export function formatCategory(cat: string): string {
  return cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  });
}
