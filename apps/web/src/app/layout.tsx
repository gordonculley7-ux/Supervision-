import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Supervision & CEU Tracker',
  description: 'Track supervised hours and continuing education for LPCC, LGSW, LMFT, and LADC.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
