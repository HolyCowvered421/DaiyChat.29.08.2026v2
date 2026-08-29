'use client';

import { useAuth } from '@/lib/supabase/auth-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bell } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export function TopHeader() {
  const { profile } = useAuth();
  const today = format(new Date(), 'EEEE, d. MMMM', { locale: de });
  const initials = (profile?.display_name || 'U')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 mx-auto max-w-[480px] px-4 pt-3 pb-2">
      <div className="glass flex items-center justify-between rounded-2xl border border-white/10 px-4 py-2.5 shadow-lg shadow-black/20">
        <div className="flex items-center gap-2.5">
          <img
            src="/images/DAIY_CHAT_BAR-removebg-preview.png"
            alt="Daiy Chat"
            className="h-11 w-auto"
          />
          <div className="hidden">
            <p className="text-[11px] capitalize text-muted-foreground leading-tight">{today}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
          </button>
          <Avatar className="h-9 w-9 border-2 border-white/10">
            <AvatarFallback className="bg-white/5 text-xs font-bold text-accent">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
