import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/context/AuthContext';
import { QueryProvider } from '@/lib/context/QueryProvider';
import './globals.css';

const geist = Geist({ variable: '--font-geist', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FST RH — Gestion des Ressources Humaines',
  description: 'Système de gestion RH — FST Mohammedia',
};

// Sans cette balise, les navigateurs mobiles rendent la page dans un viewport
// virtuel de 980px puis dézooment : l'application entière apparaît miniaturisée.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={geist.variable}>
      <body>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
