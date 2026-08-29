'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dumbbell, Clock, ChevronDown, ChevronUp, Flame, Heart, Target, Chrome as Home, Zap, Plus, Check } from 'lucide-react';
import { Exercise, WorkoutPlan, supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { format } from 'date-fns';
import { toast } from 'sonner';

type StandardPlan = {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Dumbbell;
  duration: number;
  difficulty: 'Anfänger' | 'Mittel' | 'Fortgeschritten';
  category: 'Kraft' | 'Cardio' | 'Home' | 'Ganzkörper';
  exercises: Exercise[];
};

const standardPlans: StandardPlan[] = [
  {
    id: 'fullbody-beginner',
    title: 'Ganzkörper Anfänger',
    subtitle: 'Perfekt zum Einstieg',
    icon: Dumbbell,
    duration: 45,
    difficulty: 'Anfänger',
    category: 'Ganzkörper',
    exercises: [
      { name: 'Kniebeugen', sets: 3, reps: 12, weight: 0, notes: 'Körpergewicht, saubere Form' },
      { name: 'Liegestütze', sets: 3, reps: 10, weight: 0, notes: 'Bei Bedarf auf Knien' },
      { name: 'Ausfallschritte', sets: 3, reps: 10, weight: 0, notes: 'Pro Seite' },
      { name: 'Plank', sets: 3, reps: 30, weight: 0, notes: '30 Sekunden halten' },
      { name: 'Glute Bridge', sets: 3, reps: 15, weight: 0 },
      { name: 'Superman', sets: 3, reps: 12, weight: 0, notes: 'Rücken strengthen' },
    ],
  },
  {
    id: 'upper-body-gym',
    title: 'Oberkörper Gym',
    subtitle: 'Brust, Schultern, Arme',
    icon: Dumbbell,
    duration: 60,
    difficulty: 'Mittel',
    category: 'Kraft',
    exercises: [
      { name: 'Bankdrücken', sets: 4, reps: 8, weight: 60, notes: 'Brust' },
      { name: 'Kurzhantel-Schulterdrücken', sets: 4, reps: 10, weight: 15, notes: 'Pro Seite' },
      { name: 'Latzug', sets: 4, reps: 10, weight: 40, notes: 'Rücken' },
      { name: 'Trizepsdrücken am Kabel', sets: 3, reps: 12, weight: 25 },
      { name: 'Bizeps-Curls', sets: 3, reps: 12, weight: 12, notes: 'Pro Seite' },
      { name: 'Fliegende', sets: 3, reps: 12, weight: 10, notes: 'Brust' },
    ],
  },
  {
    id: 'home-workout',
    title: '30 Min. Home Workout',
    subtitle: 'Ohne Geräte, zu Hause',
    icon: Home,
    duration: 30,
    difficulty: 'Anfänger',
    category: 'Home',
    exercises: [
      { name: 'Jumping Jacks', sets: 3, reps: 30, weight: 0, notes: 'Aufwärmen' },
      { name: 'Liegestütze', sets: 3, reps: 12, weight: 0 },
      { name: 'Bergsteiger', sets: 3, reps: 20, weight: 0, notes: 'Pro Seite' },
      { name: 'Kniebeugen', sets: 3, reps: 15, weight: 0 },
      { name: 'Plank', sets: 3, reps: 45, weight: 0, notes: '45 Sekunden halten' },
    ],
  },
  {
    id: 'cardio-core',
    title: 'Cardio & Core',
    subtitle: 'Ausdauer + Bauch',
    icon: Heart,
    duration: 30,
    difficulty: 'Mittel',
    category: 'Cardio',
    exercises: [
      { name: 'Burpees', sets: 4, reps: 10, weight: 0 },
      { name: 'Mountain Climbers', sets: 4, reps: 30, weight: 0, notes: 'Pro Seite' },
      { name: 'Crunches', sets: 4, reps: 20, weight: 0 },
      { name: 'Russian Twists', sets: 4, reps: 20, weight: 0, notes: 'Pro Seite' },
      { name: 'Plank mit Rotation', sets: 3, reps: 12, weight: 0, notes: 'Pro Seite' },
    ],
  },
  {
    id: 'lower-body',
    title: 'Unterkörper',
    subtitle: 'Beine & Po',
    icon: Target,
    duration: 45,
    difficulty: 'Mittel',
    category: 'Kraft',
    exercises: [
      { name: 'Kniebeugen mit Langhantel', sets: 4, reps: 8, weight: 50 },
      { name: 'Ausfallschritte', sets: 3, reps: 12, weight: 20, notes: 'Pro Seite' },
      { name: 'Rumänisches Kreuzheben', sets: 4, reps: 10, weight: 60, notes: 'Beinbeuger' },
      { name: 'Beinpresse', sets: 3, reps: 12, weight: 80 },
      { name: 'Wadenheben', sets: 4, reps: 15, weight: 40 },
    ],
  },
  {
    id: 'push-day',
    title: 'Push Day',
    subtitle: 'Brust, Schultern, Trizeps',
    icon: Dumbbell,
    duration: 55,
    difficulty: 'Fortgeschritten',
    category: 'Kraft',
    exercises: [
      { name: 'Bankdrücken', sets: 4, reps: 6, weight: 70, notes: 'Schweres Satz' },
      { name: 'Overhead Press', sets: 4, reps: 8, weight: 40 },
      { name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight: 20, notes: 'Pro Seite' },
      { name: 'Trizeps-Pushdown', sets: 3, reps: 12, weight: 30 },
      { name: 'Lateral Raises', sets: 3, reps: 15, weight: 8, notes: 'Pro Seite' },
      { name: 'Dips', sets: 3, reps: 10, weight: 0 },
    ],
  },
];

const difficultyColors: Record<string, string> = {
  'Anfänger': 'bg-success/10 text-success border-success/20',
  'Mittel': 'bg-warning/10 text-warning border-warning/20',
  'Fortgeschritten': 'bg-destructive/10 text-destructive border-destructive/20',
};

export function StandardPlans() {
  const { session } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedPlans, setSavedPlans] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const savePlan = async (plan: StandardPlan) => {
    if (!session?.user?.id) return;
    setSaving(plan.id);
    const today = format(new Date(), 'yyyy-MM-dd');

    const { data: existing } = await supabase
      .from('workout_plans')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      toast.error('Du hast bereits ein Training für heute. Lösche es zuerst oder wähle einen anderen Tag.');
      setSaving(null);
      return;
    }

    const { error } = await supabase.from('workout_plans').insert({
      user_id: session.user.id,
      date: today,
      title: plan.title,
      exercises: plan.exercises,
      duration_minutes: plan.duration,
      completed: false,
    });

    if (!error) {
      setSavedPlans([...savedPlans, plan.id]);
      toast.success(`${plan.title} gespeichert! Finde es im "Mein Training" Tab.`);
    } else {
      toast.error('Speichern fehlgeschlagen');
    }
    setSaving(null);
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="bg-gradient-training p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-jakarta text-base font-bold text-white">Vorgegebene Standard-Pläne</h3>
              <p className="mt-1 text-xs text-white/80 leading-relaxed">
                Wähle einen fertigen Plan und speichere ihn direkt für heute.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {standardPlans.map((plan) => {
        const Icon = plan.icon;
        const isExpanded = expandedId === plan.id;
        const isSaved = savedPlans.includes(plan.id);

        return (
          <Card key={plan.id} className="overflow-hidden border-border/60 shadow-sm animate-slide-up">
            <button
              onClick={() => toggleExpand(plan.id)}
              className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/30"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-training/10">
                <Icon className="h-5 w-5 text-training" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{plan.title}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {plan.duration} Min
                  </span>
                  <span className="text-[11px] text-muted-foreground">·</span>
                  <span className="text-[11px] text-muted-foreground">{plan.exercises.length} Übungen</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className={`text-[10px] border ${difficultyColors[plan.difficulty]}`}>
                  {plan.difficulty}
                </Badge>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {isExpanded && (
              <div className="space-y-1.5 px-4 pb-4 animate-fade-in">
                <p className="mb-2 text-xs text-muted-foreground">{plan.subtitle} · {plan.category}</p>
                {plan.exercises.map((ex, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-training/10 text-[10px] font-bold text-training">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{ex.name}</p>
                      {ex.notes && <p className="text-[10px] text-muted-foreground">{ex.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="font-bold">{ex.sets}×{ex.reps}</span>
                      {ex.weight > 0 && <span className="text-muted-foreground">{ex.weight}kg</span>}
                    </div>
                  </div>
                ))}

                <Button
                  onClick={() => savePlan(plan)}
                  disabled={saving === plan.id || isSaved}
                  className="mt-3 h-10 w-full rounded-xl bg-gradient-training text-xs font-semibold shadow-sm"
                >
                  {isSaved ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Gespeichert
                    </>
                  ) : saving === plan.id ? (
                    'Wird gespeichert…'
                  ) : (
                    <>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Für heute speichern
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
