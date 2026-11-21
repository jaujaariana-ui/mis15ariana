'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Procesando autenticación...');
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient();

        // Supabase SSR automatically handles the hash fragment tokens
        // when using createBrowserClient. We just need to check the session.
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          setStatus('error');
          setMessage('Error al procesar la autenticación: ' + error.message);
          return;
        }

        if (session) {
          setStatus('success');
          setMessage('¡Autenticación exitosa! Redirigiendo...');
          setTimeout(() => {
            router.push('/admin');
            router.refresh();
          }, 1500);
        } else {
          // Check if there are hash params we need to exchange
          const hash = window.location.hash;
          if (hash && hash.includes('access_token')) {
            // Exchange the hash fragment for a session
            const { data: { session: exchangedSession }, error: exchangeError } = await supabase.auth.setSession({
              access_token: new URLSearchParams(hash.substring(1)).get('access_token') || '',
              refresh_token: new URLSearchParams(hash.substring(1)).get('refresh_token') || '',
            });

            if (exchangeError) {
              setStatus('error');
              setMessage('Error al intercambiar tokens: ' + exchangeError.message);
              return;
            }

            if (exchangedSession) {
              setStatus('success');
              setMessage('¡Autenticación exitosa! Redirigiendo...');
              setTimeout(() => {
                router.push('/admin');
                router.refresh();
              }, 1500);
              return;
            }
          }

          setStatus('error');
          setMessage('No se encontró una sesión válida. Intenta iniciar sesión nuevamente.');
        }
      } catch (err) {
        console.error('Callback error:', err);
        setStatus('error');
        setMessage('Error inesperado al procesar la autenticación.');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Xalt Moments
          </h1>
          <p className="text-gray-500 mt-2">Panel de administración</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {status === 'loading' ? 'Verificando...' : status === 'success' ? '¡Éxito!' : 'Error'}
            </CardTitle>
            <CardDescription className="text-center">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'loading' && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              </div>
            )}
            {status === 'error' && (
              <>
                <Alert variant="destructive">
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
                <div className="mt-4 text-center">
                  <button
                    onClick={() => router.push('/admin/login')}
                    className="text-sm font-medium text-purple-600 hover:text-purple-700 hover:underline"
                  >
                    Volver al inicio de sesión
                  </button>
                </div>
              </>
            )}
            {status === 'success' && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
