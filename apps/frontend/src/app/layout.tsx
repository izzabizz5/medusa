import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Medusa — Image Protection',
  description: 'Protect your image online. Automated detection and takedowns.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
