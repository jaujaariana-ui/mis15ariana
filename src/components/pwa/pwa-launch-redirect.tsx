'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PENDING_EVENT_PATH_KEY, isStandaloneDisplay } from '@/lib/pwa';

// Al abrir la aplicación instalada (start_url "/"), restaura el evento guardado.
// En una pestaña normal del navegador no hace nada.
export default function PwaLaunchRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (!isStandaloneDisplay()) return;
    // Solo al entrar por la raíz; nunca sobrescribe una ruta de evento directa.
    if (window.location.pathname !== '/') return;

    let pendingPath: string | null = null;
    try {
      pendingPath = localStorage.getItem(PENDING_EVENT_PATH_KEY);
    } catch {
      return;
    }

    if (pendingPath && pendingPath.startsWith('/e/')) {
      router.replace(pendingPath);
    }
  }, [router]);

  return null;
}
