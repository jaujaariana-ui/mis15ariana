import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import PwaLaunchRedirect from '@/components/pwa/pwa-launch-redirect';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

export const metadata: Metadata = {
  title: 'Xalt Moments — Comparte fotos de tus eventos',
  description: 'Plataforma para compartir fotografías de eventos mediante QR. Los invitados pueden tomar fotos, subirlas y verlas en tiempo real.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Xalt Moments',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#7c3aed',
};

// Register Service Worker for PWA installation with auto-update
function ServiceWorkerRegister() {
  return (
    <script dangerouslySetInnerHTML={{ __html: `
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js').then(function(registration) {
            console.log('Service Worker registrado:', registration.scope);
            
            // Check for updates every 60 seconds
            setInterval(function() {
              registration.update();
            }, 60000);
            
            // Listen for updated Service Worker
            registration.addEventListener('updatefound', function() {
              var newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', function() {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New Service Worker available, reload page to get fresh code
                    console.log('Nueva versión disponible, recargando...');
                    window.location.reload();
                  }
                });
              }
            });
          }).catch(function(err) {
            console.log('Service Worker registration failed:', err);
          });
        });
      }
    ` }} />
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable} antialiased`}>
      <body className="min-h-screen bg-gray-50 font-sans text-gray-900">
        {children}
        <PwaLaunchRedirect />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
