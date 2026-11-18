import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Correo electrónico requerido' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get user by email
    const { data: { users }, error: fetchError } = await supabase.auth.admin.listUsers({ perPage: 1 });

    if (fetchError) {
      console.error('Fetch users error:', fetchError);
      return NextResponse.json(
        { error: 'Error al buscar el usuario' },
        { status: 500 }
      );
    }

    const user = users.find(u => u.email === email);

    if (!user) {
      return NextResponse.json(
        { error: 'No se encontró un usuario con ese correo' },
        { status: 404 }
      );
    }

    // Update user to confirm email
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (updateError) {
      console.error('Update user error:', updateError);
      return NextResponse.json(
        { error: 'Error al confirmar el email' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Email confirmado exitosamente', user: data.user },
      { status: 200 }
    );
  } catch (error) {
    console.error('Confirm email error:', error);
    return NextResponse.json(
      { error: 'Error al confirmar el email' },
      { status: 500 }
    );
  }
}
