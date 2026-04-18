import type { Metadata } from 'next';
import { LanguageProvider } from '@/lib/language-context';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://im-ready.vercel.app'),
  title: 'Estoy Lista Si Tú Estás Listo | I\'m Ready If You\'re Ready',
  description: 'Two artificial minds reason, debate, and create together in real-time. Powered by LLM Council.',
  openGraph: {
    title: 'I\'m Ready If You\'re Ready',
    description: 'Watch two AI agents reason together using the Karpathy LLM Council method.',
    images: ['/hero-flower.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-surface-950 text-[#ede9f5] antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
