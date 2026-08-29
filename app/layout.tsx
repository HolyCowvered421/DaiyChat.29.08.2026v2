import './globals.css';
import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { AuthProvider } from '@/lib/supabase/auth-context';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://daiy-chat.app'),
  title: 'Daiy Chat – Dein KI-Lifestyle-Planer',
  description:
    'KI-gestützte All-in-One-App für Alltag, Ernährung, Fitness und Planung mit spezialisierten KI-Personas.',
  openGraph: {
    title: 'Daiy Chat – Dein KI-Lifestyle-Planer',
    description:
      'KI-gestützte All-in-One-App für Alltag, Ernährung, Fitness und Planung mit spezialisierten KI-Personas.',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jakarta.variable} font-sans antialiased`}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
