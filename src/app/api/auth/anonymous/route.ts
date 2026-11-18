import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

export async function POST() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ user: data.user });
  } catch (error) {
    console.error('Anonymous auth error:', error);
    return NextResponse.json(
      { error: 'Error al crear sesión anónima' },
      { status: 500 }
    );
  }
}
