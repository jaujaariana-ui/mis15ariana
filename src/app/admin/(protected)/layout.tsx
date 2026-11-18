import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { AdminSidebar } from './_components';

interface Props {
  children: React.ReactNode;
  params?: Promise<Record<string, string | undefined>>;
}

export default async function AdminProtectedLayout({ children, params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/admin/login');
  }

  // Get organizer info
  const adminClient = createAdminClient();
  const { data: organizer } = await adminClient
    .from('organizers')
    .select('email')
    .eq('auth_user_id', user.id)
    .single();

  const resolvedParams = params ? await params : {};
  const pathname = typeof resolvedParams === 'object' ? '' : '';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r fixed h-full flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Xalt Moments
          </h1>
          <p className="text-xs text-gray-500 mt-1">Panel Admin</p>
        </div>
        <AdminSidebar />
        <div className="mt-auto p-4 border-t">
          <div className="mb-2">
            <p className="text-xs text-gray-500">Sesión actual</p>
            <p className="text-xs text-gray-700 truncate">{organizer?.email || user.email || 'Usuario'}</p>
          </div>
          <form action={async () => {
            'use server';
            const supabase = await createClient();
            await supabase.auth.signOut();
            redirect('/admin/login');
          }}>
            <button
              type="submit"
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
}
