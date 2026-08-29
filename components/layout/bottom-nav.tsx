'use client';

import { Chrome as Home, UtensilsCrossed, Dumbbell, CalendarDays } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const tabs = [
  { label: 'Start', icon: Home, path: '/dashboard', activeBg: 'bg-primary', activeText: 'text-primary', activeBar: 'bg-primary' },
  { label: 'Kalender', icon: CalendarDays, path: '/calendar', activeBg: 'bg-calendar', activeText: 'text-calendar', activeBar: 'bg-calendar' },
  { label: 'Ernährung', icon: UtensilsCrossed, path: '/nutrition', activeBg: 'bg-nutrition', activeText: 'text-nutrition', activeBar: 'bg-nutrition' },
  { label: 'Training', icon: Dumbbell, path: '/training', activeBg: 'bg-training', activeText: 'text-training', activeBar: 'bg-training' },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-[480px] px-3 pb-3 pt-1">
      <div className="glass flex items-center justify-around rounded-2xl border border-white/10 shadow-lg shadow-black/30">
        {tabs.map((tab) => {
          const active = pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className="group relative flex flex-1 flex-col items-center gap-1 py-2.5"
            >
              {active && (
                <motion.div
                  layoutId="nav-active"
                  className={`absolute -top-0.5 h-1 w-8 rounded-full ${tab.activeBar}`}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 ${
                  active
                    ? `${tab.activeBg} text-white shadow-md`
                    : 'text-muted-foreground group-hover:text-foreground group-hover:bg-muted/60'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 2} />
              </div>
              <span
                className={`text-[10px] font-semibold tracking-wide transition-colors ${
                  active ? tab.activeText : 'text-muted-foreground'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
