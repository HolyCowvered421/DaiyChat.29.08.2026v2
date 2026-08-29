'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { WorkoutPlan, supabase } from '@/lib/supabase/client';
import { format, addDays, startOfWeek, isToday, isSameDay, parseISO, subWeeks } from 'date-fns';
import { de } from 'date-fns/locale';

export function ProgressTab({ userId }: { userId: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const refDate = subWeeks(new Date(), -weekOffset);
  const weekStart = startOfWeek(refDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekKey = format(weekStart, 'yyyy-MM-dd');

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', userId)
      .gte('date', format(weekStart, 'yyyy-MM-dd'))
      .lte('date', format(weekEnd, 'yyyy-MM-dd'))
      .order('date', { ascending: true })
      .then(({ data }) => {
        setWorkouts((data as WorkoutPlan[]) || []);
        setLoading(false);
      });
  }, [userId, weekKey]);

  const completedCount = workouts.filter((w) => w.completed).length;
  const totalExercises = workouts.reduce((sum, w) => sum + w.exercises.length, 0);
  const totalMinutes = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);

  return (
    <>
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={() => setWeekOffset(weekOffset - 1)}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-semibold">
          {format(weekStart, 'd.M.', { locale: de })}–{format(weekEnd, 'd.M.yyyy', { locale: de })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg"
          onClick={() => setWeekOffset(weekOffset + 1)}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <Card className="p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-training" />
          <h3 className="font-jakarta text-base font-bold">Trainingsfortschritt</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1 rounded-xl bg-training/5 p-3">
            <span className="text-2xl font-bold text-training">{completedCount}</span>
            <span className="text-[10px] text-muted-foreground text-center">Abgeschlossen</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-training/5 p-3">
            <span className="text-2xl font-bold text-training">{totalExercises}</span>
            <span className="text-[10px] text-muted-foreground text-center">Übungen</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-training/5 p-3">
            <span className="text-2xl font-bold text-training">{totalMinutes}</span>
            <span className="text-[10px] text-muted-foreground text-center">Minuten</span>
          </div>
        </div>
      </Card>

      <Card className="p-4 shadow-sm">
        <h4 className="mb-3 text-sm font-semibold">Aktivität diese Woche</h4>
        {loading ? (
          <div className="h-32 animate-shimmer rounded-xl" />
        ) : workouts.length > 0 ? (
          <div className="flex items-end justify-between gap-2 h-32">
            {weekDays.map((day) => {
              const dayWorkouts = workouts.filter((w) => isSameDay(parseISO(w.date), day));
              const dayCompleted = dayWorkouts.filter((w) => w.completed).length;
              const hasAny = dayWorkouts.length > 0;
              const height = hasAny ? Math.max((dayCompleted / Math.max(completedCount, 1)) * 100, 15) : 0;

              return (
                <div key={format(day, 'yyyy-MM-dd')} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end justify-center">
                    <div
                      className={`w-7 max-w-full rounded-t-lg transition-all duration-500 ${
                        dayCompleted > 0
                          ? 'bg-gradient-to-t from-training to-orange-400'
                          : hasAny
                          ? 'bg-training/20'
                          : 'bg-muted/30'
                      }`}
                      style={{ height: `${height || 4}%`, minHeight: '4px' }}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${
                    isToday(day) ? 'text-training font-bold' : 'text-muted-foreground'
                  }`}>
                    {format(day, 'EE', { locale: de })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-2">
              <Flame className="h-10 w-10 text-training/30" />
              <p className="text-xs text-muted-foreground">
                Noch keine Daten. Starte dein erstes Workout!
              </p>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4 shadow-sm">
        <h4 className="mb-2 text-sm font-semibold">Progressive Overload</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Verfolge deine Gewichtssteigerungen über Zeit. Die Trainings-KI empfiehlt dir automatisch,
          wann du das Gewicht erhöhen solltest.
        </p>
      </Card>
    </>
  );
}
