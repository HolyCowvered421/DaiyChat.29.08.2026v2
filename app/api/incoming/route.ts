import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { PersonaId } from '@/lib/ai/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  supabaseUrl ?? '',
  supabaseServiceRoleKey ?? ''
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ai_id, user_id, response } = body as {
      ai_id: PersonaId;
      user_id: string;
      response: string;
    };

    if (!ai_id || !user_id || !response) {
      return NextResponse.json(
        { error: 'Missing ai_id, user_id, or response' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('chat_messages').insert({
      user_id,
      persona: ai_id as PersonaId,
      role: 'assistant',
      content: response,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to persist AI response' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
