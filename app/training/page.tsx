'use client';

import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase, WorkoutPlan, Exercise } from '@/lib/supabase/client';
import { AIChat } from '@/components/ai/ai-chat';
import { CalorieCalculator } from '@/components/training/calorie-calculator';
import { StandardPlans } from '@/components/training/standard-plans';
import { AIPlanCreator } from '@/components/training/ai-plan-creator';
import { WorkoutView } from '@/components/training/workout-view';
import { ProgressTab } from '@/components/training/progress-tab';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dumbbell, ChevronLeft, ChevronRight, Trash2, CalendarDays } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { format, addDays, subDays, startOfWeek, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

export default function TrainingPage() {
  return (
    <AppShell>
      <TrainingContent />
    </AppShell>
  );
}

function TrainingContent() {
  const { session } = useAuth();
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDate, setActiveDate] = useState(new Date());

  const dateStr = format(activeDate, 'yyyy-MM-dd');

  const loadWorkout = useCallback(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('date', dateStr)
      .maybeSingle()
      .then(({ data }) => {
        setWorkout(data as WorkoutPlan | null);
        setLoading(false);
      });
  }, [session?.user?.id, dateStr]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  const weekStart = startOfWeek(activeDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const toggleComplete = async () => {
    if (!workout || !session?.user?.id) return;
    const updated = !workout.completed;
    const { error } = await supabase
      .from('workout_plans')
      .update({ completed: updated })
      .eq('id', workout.id);
    if (!error) {
      setWorkout({ ...workout, completed: updated });
      toast.success(updated ? 'Training als erledigt markiert!' : 'Training wieder geöffnet');
    }
  };

  const addToCalendar = async () => {
    if (!workout || !session?.user?.id) return;
    const startTime = new Date(activeDate);
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + (workout.duration_minutes || 60));

    const { error } = await supabase.from('events').insert({
      user_id: session.user.id,
      title: workout.title,
      event_type: 'training',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      linked_workout_id: workout.id,
      color: 'orange',
    });

    if (!error) {
      toast.success('Training zum Kalender hinzugefügt!');
    } else {
      toast.error('Fehler beim Hinzufügen zum Kalender');
    }
  };

  const deleteWorkout = async () => {
    if (!workout) return;
    const { error } = await supabase.from('workout_plans').delete().eq('id', workout.id);
    if (!error) {
      setWorkout(null);
      toast.success('Training gelöscht');
    } else {
      toast.error('Löschen fehlgeschlagen');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-jakarta text-2xl font-bold tracking-tight">Trainingsplan</h2>
        <p className="text-sm text-muted-foreground">
          {format(activeDate, 'EEEE, d. MMMM', { locale: de })}
        </p>
      </div>

      {/* Week Day Selector */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {weekDays.map((day) => {
          const isActive = format(day, 'yyyy-MM-dd') === dateStr;
          const todayCheck = format(new Date(), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
          return (
            <button
              key={format(day, 'yyyy-MM-dd')}
              onClick={() => setActiveDate(day)}
              className={`flex min-w-[56px] flex-col items-center gap-1 rounded-2xl border-2 px-3 py-2.5 transition-all ${
                isActive
                  ? 'border-training bg-training/5 shadow-sm'
                  : 'border-border bg-card hover:border-training/30'
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase ${isActive ? 'text-training' : 'text-muted-foreground'}`}>
                {format(day, 'EE', { locale: de })}
              </span>
              <span className={`text-base font-bold ${isActive ? 'text-training' : ''}`}>
                {format(day, 'd')}
              </span>
              {todayCheck && <span className="h-1.5 w-1.5 rounded-full bg-training" />}
            </button>
          );
        })}
      </div>

      <Tabs defaultValue="myworkout" className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-xl">
          <TabsTrigger value="myworkout" className="text-[10px] px-1">Mein Training</TabsTrigger>
          <TabsTrigger value="create" className="text-[10px] px-1">KI erstellen</TabsTrigger>
          <TabsTrigger value="standard" className="text-[10px] px-1">Standard</TabsTrigger>
          <TabsTrigger value="calculator" className="text-[10px] px-1">Kalorien</TabsTrigger>
        </TabsList>

        {/* Mein Training Tab */}
        <TabsContent value="myworkout" className="space-y-3 mt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 animate-shimmer rounded-2xl" />
              ))}
            </div>
          ) : workout ? (
            <div className="space-y-3">
              <WorkoutView
                workout={workout}
                onToggleComplete={toggleComplete}
                onAddToCalendar={addToCalendar}
                onUpdateExercises={(exercises) => {
                  setWorkout({ ...workout, exercises });
                }}
              />
              <Button
                variant="ghost"
                onClick={deleteWorkout}
                className="w-full rounded-xl text-xs text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Training löschen
              </Button>
            </div>
          ) : (
            <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center border-dashed border-2 border-training/20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-training/10">
                <Dumbbell className="h-8 w-8 text-training" />
              </div>
              <div>
                <p className="text-sm font-semibold">Kein Training für diesen Tag</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Erstelle einen KI-Plan oder wähle einen Standard-Plan
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-xl text-xs"
                  onClick={() => {
                    const tab = document.querySelector('[value="create"]') as HTMLElement;
                    tab?.click();
                  }}
                >
                  KI-Plan erstellen
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-xl text-xs"
                  onClick={() => {
                    const tab = document.querySelector('[value="standard"]') as HTMLElement;
                    tab?.click();
                  }}
                >
                  Standard-Pläne
                </Button>
              </div>
            </Card>
          )}

          {/* Progress below */}
          {!loading && (
            <div className="pt-2">
              <ProgressTab userId={session?.user?.id || ''} />
            </div>
          )}
        </TabsContent>

        {/* KI erstellen Tab */}
        <TabsContent value="create" className="mt-4">
          <AIPlanCreator />
        </TabsContent>

        {/* Standard-Pläne Tab */}
        <TabsContent value="standard" className="mt-4">
          <StandardPlans />
        </TabsContent>

        {/* Kalorienrechner Tab */}
        <TabsContent value="calculator" className="mt-4">
          <CalorieCalculator />
        </TabsContent>

      </Tabs>

      {/* KI-Chat — immer sichtbar unter den Tabs */}
      <AIChat persona="training" />
    </div>
  );
}
