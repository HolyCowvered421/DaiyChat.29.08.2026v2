'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dumbbell, Clock, CircleCheck as CheckCircle2, Circle, CalendarPlus, Timer, Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Exercise, WorkoutPlan, supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export function WorkoutView({
  workout,
  onToggleComplete,
  onAddToCalendar,
  onUpdateExercises,
}: {
  workout: WorkoutPlan;
  onToggleComplete: () => void;
  onAddToCalendar: () => void;
  onUpdateExercises: (exercises: Exercise[]) => void;
}) {
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSets = workout.exercises.reduce(
    (sum, ex) => sum + (ex.completedSets?.filter(Boolean).length || 0),
    0
  );
  const progressPercent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  const toggleSet = async (exIdx: number, setIdx: number) => {
    const exercises = [...workout.exercises];
    const ex = { ...exercises[exIdx] };
    if (!ex.completedSets) ex.completedSets = Array(ex.sets).fill(false);
    ex.completedSets = [...ex.completedSets];
    ex.completedSets[setIdx] = !ex.completedSets[setIdx];
    exercises[exIdx] = ex;
    onUpdateExercises(exercises);

    await supabase
      .from('workout_plans')
      .update({ exercises })
      .eq('id', workout.id);

    if (ex.completedSets[setIdx]) {
      startRestTimer(60);
    } else {
      stopRestTimer();
    }
  };

  const startRestTimer = (seconds: number) => {
    stopRestTimer();
    setRestTimer(seconds);
    timerRef.current = setInterval(() => {
      setRestTimer((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          toast.success('Pause vorbei – weiter gehts!', { duration: 3000 });
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopRestTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRestTimer(null);
  };

  useEffect(() => {
    return () => stopRestTimer();
  }, []);

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <div className="bg-gradient-training p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-jakarta text-lg font-bold text-white">{workout.title}</h3>
            <div className="mt-1 flex items-center gap-3 text-xs text-white/80">
              {workout.duration_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {workout.duration_minutes} Min
                </span>
              )}
              <span className="flex items-center gap-1">
                <Dumbbell className="h-3.5 w-3.5" />
                {workout.exercises.length} Übungen
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {completedSets}/{totalSets} Sätze
              </span>
            </div>
          </div>
          <button
            onClick={onToggleComplete}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition-all hover:bg-white/30"
          >
            {workout.completed ? (
              <CheckCircle2 className="h-6 w-6 text-white" />
            ) : (
              <Circle className="h-6 w-6 text-white/70" />
            )}
          </button>
        </div>

        {totalSets > 0 && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {restTimer !== null && (
        <div className="flex items-center justify-between bg-training/10 px-4 py-2.5 animate-slide-up">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-training animate-pulse" />
            <span className="text-sm font-semibold text-training">
              Pause: {restTimer}s
            </span>
          </div>
          <button
            onClick={stopRestTimer}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Überspringen
          </button>
        </div>
      )}

      <div className="divide-y divide-border/40">
        {workout.exercises.map((ex: Exercise, exIdx: number) => {
          const setsArr = Array.from({ length: ex.sets }, (_, i) => i);
          const exCompleted = ex.completedSets?.filter(Boolean).length || 0;
          const allDone = exCompleted === ex.sets;

          return (
            <div key={exIdx} className="p-4 animate-slide-up" style={{ animationDelay: `${exIdx * 50}ms` }}>
              <div className="mb-3 flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
                  allDone ? 'bg-training text-white' : 'bg-training/10 text-training'
                }`}>
                  {allDone ? <CheckCircle2 className="h-5 w-5" /> : exIdx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{ex.name}</p>
                  {ex.notes && <p className="text-xs text-muted-foreground">{ex.notes}</p>}
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {exCompleted}/{ex.sets}
                </Badge>
              </div>

              <div className="space-y-1.5">
                {setsArr.map((setIdx) => {
                  const isDone = ex.completedSets?.[setIdx] || false;
                  return (
                    <button
                      key={setIdx}
                      onClick={() => toggleSet(exIdx, setIdx)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                        isDone
                          ? 'border-training/30 bg-training/5'
                          : 'border-border/50 bg-muted/30 hover:border-training/20'
                      }`}
                    >
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg border-2 transition-all ${
                        isDone ? 'border-training bg-training' : 'border-muted-foreground/30'
                      }`}>
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground/40" />
                        )}
                      </div>
                      <span className={`text-xs font-bold ${isDone ? 'text-training' : 'text-muted-foreground'}`}>
                        Satz {setIdx + 1}
                      </span>
                      <div className="ml-auto flex items-center gap-4 text-xs">
                        <div className="text-center">
                          <span className={`font-bold ${isDone ? 'text-training' : ''}`}>{ex.reps}</span>
                          <span className="ml-1 text-[10px] text-muted-foreground">Wdh</span>
                        </div>
                        <div className="text-center">
                          <span className={`font-bold ${isDone ? 'text-training' : ''}`}>{ex.weight}</span>
                          <span className="ml-1 text-[10px] text-muted-foreground">kg</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 p-4 pt-3 border-t border-border/40">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 rounded-xl text-xs"
          onClick={onAddToCalendar}
        >
          <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
          Zum Kalender
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 rounded-xl text-xs text-training hover:text-training"
          onClick={() => toast.info('Plan wird angepasst…')}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Plan anpassen
        </Button>
      </div>
    </Card>
  );
}
