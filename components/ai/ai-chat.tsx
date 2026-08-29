'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase, Persona, ChatMessage } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader as Loader2, Sparkles, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { AI_API_BASE } from '@/lib/ai/config';
import type { AIStatusEntry } from '@/lib/ai/types';

type PersonaConfig = {
  name: string;
  color: string;
  gradient: string;
  description: string;
};

const personaConfigs: Record<Persona, PersonaConfig> = {
  nutrition: {
    name: 'Ernährungs-KI',
    color: 'nutrition',
    gradient: 'bg-gradient-nutrition',
    description: 'Spezialisiert für Mahlzeiten, Rezepte und Makros',
  },
  training: {
    name: 'Trainings-KI',
    color: 'training',
    gradient: 'bg-gradient-training',
    description: 'Spezialisiert für Workouts, Übungen und Progression',
  },
  calendar: {
    name: 'Kalender-KI',
    color: 'calendar',
    gradient: 'bg-gradient-calendar',
    description: 'Spezialisiert für Termine und Zeitplanung',
  },
  dashboard: {
    name: 'Daiy Chat KI',
    color: 'primary',
    gradient: 'bg-gradient-primary',
    description: 'Dein täglicher Überblick und Assistenz',
  },
};

export function AIChat({ persona }: { persona: Persona }) {
  const { session } = useAuth();
  const config = personaConfigs[persona];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [aiStatus, setAiStatus] = useState<AIStatusEntry | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isMaintenance = aiStatus?.status === 'maintenance';

  // Fetch AI availability status on mount
  const fetchStatus = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(`${AI_API_BASE}/ai-status`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const entry = data.statuses?.[persona];
        if (entry) setAiStatus(entry);
      }
    } catch {
      // Silently fail — default to active
    }
  }, [session?.access_token, persona]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Load chat history
  useEffect(() => {
    if (!session?.user?.id) return;
    setHistoryLoading(true);
    supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('persona', persona)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMessages(data as ChatMessage[]);
        } else {
          setMessages([
            {
              id: 'welcome',
              user_id: session.user.id,
              persona,
              role: 'assistant',
              content: `Hallo! Ich bin deine ${config.name}. ${config.description}. Wie kann ich dir helfen?`,
              created_at: new Date().toISOString(),
            },
          ]);
        }
        setHistoryLoading(false);
      });
  }, [session?.user?.id, persona, config.name, config.description]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading || !session?.user?.id || isMaintenance) return;
    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: session.user.id,
      persona,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    // Persist user message to chat history
    await supabase.from('chat_messages').insert({
      user_id: session.user.id,
      persona,
      role: 'user',
      content: userMessage,
    });

    try {
      // Send ONLY through our own API route — no direct backend/AI calls
      const response = await fetch(`${AI_API_BASE}/outgoing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          ai_id: persona,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (errData.error === 'maintenance') {
          setAiStatus({
            ai_id: persona,
            status: 'maintenance',
            maintenance_message: errData.maintenance_message ?? null,
          });
          throw new Error('maintenance');
        }
        throw new Error('AI request failed');
      }

      const data = await response.json();
      const aiResponse: string = data.response || 'Entschuldigung, ich konnte keine Antwort generieren.';

      const tempAiMsg: ChatMessage = {
        id: `temp-ai-${Date.now()}`,
        user_id: session.user.id,
        persona,
        role: 'assistant',
        content: aiResponse,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempAiMsg]);

      // Persist AI response via incoming route (server-side)
      await fetch(`${AI_API_BASE}/incoming`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ai_id: persona,
          user_id: session.user.id,
          response: aiResponse,
        }),
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'maintenance') {
        toast.error(aiStatus?.maintenance_message ?? 'Diese KI wird gerade gewartet.');
      } else {
        const fallbackMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          user_id: session.user.id,
          persona,
          role: 'assistant',
          content:
            'Entschuldigung, ich bin gerade nicht erreichbar. Bitte versuche es später erneut.',
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        toast.error('KI ist gerade nicht erreichbar');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.gradient}`}>
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">{config.name}</p>
          <p className="text-[11px] text-muted-foreground">{config.description}</p>
        </div>
        {aiStatus && (
          <span
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              isMaintenance
                ? 'bg-warning/10 text-warning'
                : 'bg-success/10 text-success'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isMaintenance ? 'bg-warning' : 'bg-success'}`} />
            {isMaintenance ? 'Wartung' : 'Online'}
          </span>
        )}
      </div>

      {/* Maintenance notice */}
      {isMaintenance && (
        <div className="flex items-start gap-2.5 border-b border-warning/20 bg-warning/5 px-4 py-3 animate-fade-in">
          <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="text-xs font-semibold text-warning">Wartungsmodus</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {aiStatus?.maintenance_message ?? 'Diese KI wird gerade gewartet und ist vorübergehend nicht verfügbar.'}
            </p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="max-h-[300px] min-h-[180px] overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {historyLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm animate-slide-up ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-white/8 text-foreground rounded-bl-md border border-white/10'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p className={`mt-1 text-[10px] ${msg.role === 'user' ? 'text-primary-foreground/50' : 'text-muted-foreground'}`}>
                  {format(new Date(msg.created_at), 'HH:mm', { locale: de })}
                </p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-white/8 border border-white/10 px-3.5 py-2.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Denkt nach…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input — disabled during maintenance */}
      <div className="flex items-end gap-2 border-t border-white/10 p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={isMaintenance ? 'KI im Wartungsmodus…' : `Frage die ${config.name}…`}
          disabled={isMaintenance}
          className="min-h-[44px] max-h-24 flex-1 resize-none rounded-xl border-white/10 bg-white/5 text-sm placeholder:text-muted-foreground/60 focus-visible:border-primary/40 disabled:opacity-50"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || loading || isMaintenance}
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl bg-gradient-primary border-0 shadow-sm hover:opacity-90"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
