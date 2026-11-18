import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Correo y nueva contraseña son requeridos' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // List users to find the user
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1 });

    if (listError) {
      console.error('List users error:', listError);
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

    // Update user password
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Update password error:', updateError);
      return NextResponse.json(
        { error: 'Error al resetear la contraseña' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Contraseña reseteada exitosamente', userId: data.user.id },
      { status: 200 }
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Error al resetear la contraseña' },
      { status: 500 }
    );
  }
}
