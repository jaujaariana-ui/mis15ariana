import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Correo y contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if user already exists
    const { data: existingUsers } = await supabase
      .from('organizers')
      .select('auth_user_id')
      .eq('email', email)
      .single();

    if (existingUsers) {
      return NextResponse.json(
        { error: 'Este correo ya está registrado' },
        { status: 409 }
      );
    }

    // Create user with email confirmed
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      console.error('Register error:', error);
      if (error.message?.includes('already exists') || error.message?.includes('already registered')) {
        return NextResponse.json(
          { error: 'Este correo ya está registrado' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Error al crear la cuenta' },
        { status: 500 }
      );
    }

    // Create organizer profile
    await supabase
      .from('organizers')
      .insert({
        auth_user_id: data.user.id,
        email,
      });

    return NextResponse.json(
      { message: 'Cuenta creada exitosamente', user: data.user },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Error al crear la cuenta' },
      { status: 500 }
    );
  }
}
