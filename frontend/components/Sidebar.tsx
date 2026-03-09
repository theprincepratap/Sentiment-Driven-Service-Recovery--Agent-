'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  Ticket,
  Map,
  BarChart3,
  Bell,
  Activity,
  Heart,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWebSocketContext } from '@/components/WSProvider';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/agent', icon: Bot, label: 'AI Agent' },
  { href: '/feedback', icon: MessageSquare, label: 'Feedback Monitor' },
  { href: '/tickets', icon: Ticket, label: 'Complaint Tickets' },
  { href: '/heatmap', icon: Map, label: 'Department Heatmap' },
  { href: '/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { connected, eventCount } = useWebSocketContext();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col z-50"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>

      {/* Logo */}
      <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
            <Heart size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
              Recovery Agent
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Hospital AI System</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                active
                  ? 'text-white'
                  : 'hover:text-white'
              )}
              style={active ? {
                background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
                color: '#f0f4ff',
                border: '1px solid rgba(59,130,246,0.3)'
              } : {
                color: 'var(--text-secondary)',
              }}
            >
              <Icon size={18} className={active ? 'text-blue-400' : ''} />
              {label}
              {label === 'Notifications' && eventCount > 0 && (
                <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                  {eventCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Connection Status */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', connected ? 'bg-green-400' : 'bg-red-400')}
            style={connected ? { animation: 'pulse-dot 2s ease-in-out infinite' } : {}} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {connected ? 'Live — Real-time active' : 'Connecting...'}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Activity size={12} style={{ color: 'var(--text-muted)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>WebSocket feed</span>
        </div>
      </div>
    </aside>
  );
}
