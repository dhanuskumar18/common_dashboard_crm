import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CostTracking CRM — Common Lead Hub',
  description: 'Enterprise multi-company lead management and assignment platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body className="min-h-full bg-zinc-50 text-slate-800 flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
