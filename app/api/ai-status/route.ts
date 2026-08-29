import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { PersonaId, AIStatusEntry, AIStatusMap } from '@/lib/ai/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('ai_status')
      .select('ai_id, status, maintenance_message');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch AI status' },
        { status: 500 }
      );
    }

    const statusMap: AIStatusMap = {};
    for (const row of data ?? []) {
      statusMap[row.ai_id as PersonaId] = {
        ai_id: row.ai_id as PersonaId,
        status: row.status as 'active' | 'maintenance',
        maintenance_message: row.maintenance_message,
      } as AIStatusEntry;
    }

    return NextResponse.json({ statuses: statusMap });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
