import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Correo electrónico requerido' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // URL a la que Supabase redirigirá después de que el usuario haga clic en el enlace
    // y establezca su nueva contraseña. Esta URL debe apuntar a la página /auth/callback.
    const redirectTo = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/callback`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error('Reset password email error:', error);
      // No revelamos si el email existe o no por seguridad
      return NextResponse.json(
        { message: 'Si el correo existe, recibirás un enlace para resetear tu contraseña.' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { message: 'Si el correo existe, recibirás un enlace para resetear tu contraseña.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
