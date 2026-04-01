import type { Metadata } from 'next';
import './globals.css';
import { Cormorant_Garamond, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';

const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['300','400','600','700'], style: ['normal','italic'], variable: '--font-display', display: 'swap' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-body', display: 'swap' });
const ibmMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['300','400','500'], style: ['normal','italic'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Medusa — Image Protection',
  description: 'Protect your image online. Automated detection and takedowns.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${spaceGrotesk.variable} ${ibmMono.variable}`}>{children}</body>
    </html>
  );
}
