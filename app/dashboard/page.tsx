'use client';

import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase, MealPlan, WorkoutPlan, Event } from '@/lib/supabase/client';
import { AIChat } from '@/components/ai/ai-chat';
import { CalendarDays, UtensilsCrossed, Dumbbell, Clock, MapPin, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function DashboardContent() {
  const { session, profile } = useAuth();
  const router = useRouter();
  const [nextEvent, setNextEvent] = useState<Event | null>(null);
  const [nextMeal, setNextMeal] = useState<MealPlan | null>(null);
  const [nextWorkout, setNextWorkout] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    const nowIso = new Date().toISOString();

    Promise.all([
      supabase
        .from('events')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('start_time', nowIso)
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]).then(([eventRes, mealRes, workoutRes]) => {
      setNextEvent(eventRes.data as Event | null);
      setNextMeal(mealRes.data as MealPlan | null);
      setNextWorkout(workoutRes.data as WorkoutPlan | null);
      setLoading(false);
    });
  }, [session?.user?.id, today]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 11) return 'Guten Morgen';
    if (h < 17) return 'Guten Tag';
    return 'Guten Abend';
  })();

  const formatDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Heute';
    if (isTomorrow(date)) return 'Morgen';
    return format(date, 'EE, d. MMM', { locale: de });
  };

  const formatEventTime = (startStr: string) => {
    const date = new Date(startStr);
    if (isToday(date)) return format(date, 'HH:mm', { locale: de });
    if (isTomorrow(date)) return `Morgen ${format(date, 'HH:mm', { locale: de })}`;
    return format(date, 'EE HH:mm', { locale: de });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Greeting */}
      <div>
        <h2 className="font-jakarta text-2xl font-bold tracking-tight">
          {greeting}, {profile?.display_name?.split(' ')[0] || ''}!
        </h2>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE, d. MMMM', { locale: de })}
        </p>
      </div>

      {/* Widgets - 2 columns */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Next Appointment Widget */}
        <WidgetCard
          loading={loading}
          icon={<CalendarDays className="h-4 w-4 text-white" />}
          iconBg="bg-gradient-calendar"
          title="Termin"
          primary={nextEvent?.title}
          secondary={nextEvent ? formatEventTime(nextEvent.start_time) : null}
          tertiary={nextEvent?.location}
          emptyTitle="Plane deine Termine"
          emptySub="Kein Termin"
          onClick={() => router.push('/calendar')}
        />

        {/* Next Meal Widget */}
        <WidgetCard
          loading={loading}
          icon={<UtensilsCrossed className="h-4 w-4 text-white" />}
          iconBg="bg-gradient-nutrition"
          title="Mahlzeit"
          primary={nextMeal && nextMeal.meals.length > 0 ? nextMeal.meals[0]?.name : null}
          secondary={nextMeal && nextMeal.meals.length > 0 ? formatDateLabel(nextMeal.date) : null}
          tertiary={nextMeal && nextMeal.meals.length > 0 ? `${nextMeal.total_calories} kcal` : null}
          emptyTitle="Plane Mahlzeit"
          emptySub="Nichts geplant"
          onClick={() => router.push('/nutrition')}
        />

        {/* Next Training Widget */}
        <WidgetCard
          loading={loading}
          icon={<Dumbbell className="h-4 w-4 text-white" />}
          iconBg="bg-gradient-training"
          title="Training"
          primary={nextWorkout?.title}
          secondary={nextWorkout ? formatDateLabel(nextWorkout.date) : null}
          tertiary={nextWorkout ? `${nextWorkout.exercises.length} Übungen` : null}
          emptyTitle="Plane Training"
          emptySub="Kein Training"
          onClick={() => router.push('/training')}
        />

        {/* Quick Stats / Date Widget */}
        <button
          onClick={() => router.push('/calendar')}
          className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition-all hover:bg-white/10"
          style={{ minHeight: '110px' }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <Clock className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight">
              {format(new Date(), 'd. MMM', { locale: de })}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {format(new Date(), 'EEEE', { locale: de })}
            </p>
          </div>
        </button>
      </div>

      {/* AI Chat */}
      <div>
        <h3 className="mb-2.5 font-jakarta text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Daiy Chat KI
        </h3>
        <AIChat persona="dashboard" />
      </div>
    </div>
  );
}

type WidgetCardProps = {
  loading: boolean;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  primary: string | null | undefined;
  secondary: string | null | undefined;
  tertiary: string | null | undefined;
  emptyTitle: string;
  emptySub: string;
  onClick: () => void;
};

function WidgetCard({ loading, icon, iconBg, title, primary, secondary, tertiary, emptyTitle, emptySub, onClick }: WidgetCardProps) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition-all hover:bg-white/10 hover:border-white/20"
      style={{ minHeight: '110px' }}
    >
      <div className="flex items-center justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </div>
      {loading ? (
        <div className="h-6 w-full animate-shimmer rounded-lg" />
      ) : primary ? (
        <div className="min-w-0">
          <p className="truncate text-xs font-bold leading-tight">{primary}</p>
          {secondary && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              {secondary}
            </p>
          )}
          {tertiary && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {tertiary}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-0.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg border border-dashed border-white/20">
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-[11px] font-semibold text-muted-foreground">{emptyTitle}</p>
          <p className="text-[10px] text-muted-foreground/60">{emptySub}</p>
        </div>
      )}
    </button>
  );
}
