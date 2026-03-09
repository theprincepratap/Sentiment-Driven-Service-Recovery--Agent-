import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import WSProvider from '@/components/WSProvider';

export const metadata: Metadata = {
  title: 'Sentiment Recovery Agent | Hospital AI System',
  description: 'AI-powered hospital patient feedback system with real-time sentiment analysis and complaint management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <WSProvider>
          <Sidebar />
          <main className="flex-1 ml-64 overflow-auto">
            {children}
          </main>
        </WSProvider>
      </body>
    </html>
  );
}
