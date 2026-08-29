import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { PersonaId } from '@/lib/ai/types';

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { message, ai_id, context } = body as {
      message: string;
      ai_id: PersonaId;
      context?: Record<string, string>;
    };

    if (!message || !ai_id) {
      return NextResponse.json(
        { error: 'Missing message or ai_id' },
        { status: 400 }
      );
    }

    // Check maintenance status before forwarding
    const { data: statusRow } = await supabase
      .from('ai_status')
      .select('status, maintenance_message')
      .eq('ai_id', ai_id as string)
      .maybeSingle();

    if (statusRow?.status === 'maintenance') {
      return NextResponse.json(
        {
          error: 'maintenance',
          maintenance_message:
            statusRow.maintenance_message ??
            'Diese KI wird gerade gewartet und ist vorübergehend nicht verfügbar.',
        },
        { status: 503 }
      );
    }

    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/ai-persona`;

    const backendResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(
        context
          ? { persona: ai_id, message, context }
          : { persona: ai_id, message }
      ),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text().catch(() => 'Backend error');
      return NextResponse.json(
        { error: 'AI backend request failed', details: errorText },
        { status: backendResponse.status }
      );
    }

    const data = await backendResponse.json();
    const aiResponse: string = data.response ?? '';

    // If the edge function returned a structured plan, pass it through
    if (data.plan) {
      return NextResponse.json({ plan: data.plan, ai_id });
    }

    return NextResponse.json({ response: aiResponse, ai_id });
  } catch {
    return NextResponse.json(
      {
        error: 'Internal server error',
        response: 'Entschuldigung, es ist ein Fehler aufgetreten.',
      },
      { status: 500 }
    );
  }
}
