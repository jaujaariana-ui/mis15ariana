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

    // Check if organizer already exists
    const { data: existingOrganizer } = await supabase
      .from('organizers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (existingOrganizer) {
      return NextResponse.json(
        { message: 'El organizador ya existe', organizerId: existingOrganizer.id },
        { status: 200 }
      );
    }

    // Create organizer profile
    const { data: organizer, error: insertError } = await supabase
      .from('organizers')
      .insert({
        auth_user_id: user.id,
        email: email,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert organizer error:', insertError);
      return NextResponse.json(
        { error: 'Error al crear el perfil de organizador' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Perfil de organizador creado exitosamente', organizer },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create organizer error:', error);
    return NextResponse.json(
      { error: 'Error al crear el perfil de organizador' },
      { status: 500 }
    );
  }
}
