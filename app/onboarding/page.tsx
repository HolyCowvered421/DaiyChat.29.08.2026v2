'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/supabase/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Target,
  AlertTriangle,
  Salad,
  Dumbbell,
  Heart,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  PartyPopper,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const goals = [
  { id: 'lose_weight', label: 'Gewicht verlieren', icon: Target },
  { id: 'build_muscle', label: 'Muskeln aufbauen', icon: Dumbbell },
  { id: 'stay_fit', label: 'Fit bleiben', icon: Heart },
  { id: 'eat_healthier', label: 'Gesünder essen', icon: Salad },
];

const dietTypes = [
  { id: 'omnivore', label: 'Allesesser' },
  { id: 'vegetarian', label: 'Vegetarisch' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'pescatarian', label: 'Pescatarisch' },
  { id: 'keto', label: 'Keto' },
  { id: 'low_carb', label: 'Low Carb' },
];

const commonAllergies = [
  'Laktose', 'Gluten', 'Nüsse', 'Eier', 'Soja', 'Fisch', 'Schalentiere', 'Sesam', 'Erdnüsse',
];

const trainingRhythms = [
  { id: 'beginner', label: 'Anfänger (1-2x/Woche)' },
  { id: 'intermediate', label: 'Fortgeschritten (3-4x/Woche)' },
  { id: 'advanced', label: 'Erfahren (5+ pro Woche)' },
  { id: 'none', label: 'Noch nicht aktiv' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { session, refreshProfile, refreshMemory } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [goal, setGoal] = useState('');
  const [dietType, setDietType] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [trainingRhythm, setTrainingRhythm] = useState('');
  const [favoriteFoods, setFavoriteFoods] = useState<string[]>([]);
  const [foodInput, setFoodInput] = useState('');

  const totalSteps = 6;

  const toggleAllergy = (item: string) => {
    setAllergies((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const addFood = () => {
    const trimmed = foodInput.trim();
    if (trimmed && !favoriteFoods.includes(trimmed)) {
      setFavoriteFoods([...favoriteFoods, trimmed]);
      setFoodInput('');
    }
  };

  const removeFood = (food: string) => {
    setFavoriteFoods(favoriteFoods.filter((f) => f !== food));
  };

  const handleComplete = async () => {
    if (!session?.user?.id) return;
    setLoading(true);

    const goalLabel = goals.find((g) => g.id === goal)?.label || goal;

    const { error: memError } = await supabase.from('user_memory').upsert({
      user_id: session.user.id,
      goals: goalLabel,
      diet_type: dietType || null,
      allergies,
      training_rhythm: trainingRhythm || null,
      favorite_foods: favoriteFoods,
      calorie_target: 2200,
      protein_target: 150,
      carbs_target: 250,
      fat_target: 70,
    });

    if (memError) {
      console.error('Memory save failed', memError);
      toast.error('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
      setLoading(false);
      return;
    }

    const { error: profError } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', session.user.id);

    if (profError) {
      console.error('Profile update failed', profError);
      toast.error('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
      setLoading(false);
      return;
    }

    await refreshProfile();
    await refreshMemory();
    setLoading(false);
    toast.success('Onboarding abgeschlossen!');
    router.push('/dashboard');
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return !!goal;
      case 2:
        return !!dietType;
      case 3:
        return true;
      case 4:
        return !!trainingRhythm;
      case 5:
        return true;
      default:
        return true;
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-sm">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Schritt {step + 1} von {totalSteps}
            </p>
            <Progress value={((step + 1) / totalSteps) * 100} className="mt-1 h-1.5 w-40" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-1 flex-col"
          >
            {step === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-primary shadow-glow-primary animate-pulse-ring">
                  <Sparkles className="h-10 w-10 text-white" />
                </div>
                <h1 className="font-jakarta text-2xl font-bold tracking-tight">
                  Willkommen bei Daiy Chat!
                </h1>
                <p className="mt-3 text-sm text-muted-foreground text-balance">
                  Lass uns dein Profil einrichten, damit unsere KI-Personas perfekt auf dich
                  zugeschnittene Pläne erstellen können.
                </p>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <h2 className="font-jakarta text-xl font-bold">Was ist dein Hauptziel?</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Wähle, was du mit Daiy Chat erreichen möchtest.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {goals.map((g) => {
                    const Icon = g.icon;
                    const selected = goal === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setGoal(g.id)}
                        className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-4 transition-all ${
                          selected
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border bg-card hover:border-primary/30'
                        }`}
                      >
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                            selected ? 'bg-gradient-primary text-white' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-semibold">{g.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Salad className="h-5 w-5 text-nutrition" />
                  <h2 className="font-jakarta text-xl font-bold">Deine Ernährungsform</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Wie ernährst du dich aktuell?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {dietTypes.map((d) => {
                    const selected = dietType === d.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() => setDietType(d.id)}
                        className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3.5 text-sm font-semibold transition-all ${
                          selected
                            ? 'border-nutrition bg-nutrition/5 shadow-sm'
                            : 'border-border bg-card hover:border-nutrition/30'
                        }`}
                      >
                        {selected && <Check className="h-4 w-4 text-nutrition" />}
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <h2 className="font-jakarta text-xl font-bold">Allergien & Unverträglichkeiten</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Wähle alles aus, worauf du reagierst. Die KI wird diese bei der Planung berücksichtigen.
                </p>
                <div className="flex flex-wrap gap-2">
                  {commonAllergies.map((a) => {
                    const selected = allergies.includes(a);
                    return (
                      <button
                        key={a}
                        onClick={() => toggleAllergy(a)}
                        className={`rounded-full border-2 px-4 py-2 text-sm font-medium transition-all ${
                          selected
                            ? 'border-warning bg-warning/10 text-warning'
                            : 'border-border bg-card text-muted-foreground hover:border-warning/30'
                        }`}
                      >
                        {selected && <Check className="mr-1 inline h-3.5 w-3.5" />}
                        {a}
                      </button>
                    );
                  })}
                </div>
                {allergies.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {allergies.map((a) => (
                      <Badge key={a} variant="secondary" className="gap-1">
                        {a}
                        <button onClick={() => toggleAllergy(a)} className="ml-1 hover:text-destructive">
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-training" />
                  <h2 className="font-jakarta text-xl font-bold">Dein Trainingsrhythmus</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Wie oft trainierst du aktuell?
                </p>
                <div className="space-y-2">
                  {trainingRhythms.map((t) => {
                    const selected = trainingRhythm === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTrainingRhythm(t.id)}
                        className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3.5 text-sm font-semibold transition-all ${
                          selected
                            ? 'border-training bg-training/5 shadow-sm'
                            : 'border-border bg-card hover:border-training/30'
                        }`}
                      >
                        {t.label}
                        {selected && <Check className="h-4 w-4 text-training" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-destructive" />
                  <h2 className="font-jakarta text-xl font-bold">Lieblingsessen</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Füge einige deiner Lieblingslebensmittel hinzu – die KI wird diese bevorzugen.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={foodInput}
                    onChange={(e) => setFoodInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFood())}
                    placeholder="z.B. Hähnchen, Avocado, Reis…"
                    className="h-11 rounded-xl"
                  />
                  <Button onClick={addFood} variant="secondary" className="h-11 rounded-xl px-4">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                {favoriteFoods.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {favoriteFoods.map((f) => (
                      <Badge key={f} variant="secondary" className="gap-1 bg-primary/10 text-primary">
                        {f}
                        <button onClick={() => removeFood(f)} className="ml-1 hover:text-destructive">
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                {favoriteFoods.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Du kannst diesen Schritt auch überspringen.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <Button
              onClick={() => setStep(step - 1)}
              variant="secondary"
              className="h-12 rounded-xl px-5"
              disabled={loading}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          {step < totalSteps - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed() || loading}
              className="h-12 flex-1 rounded-xl bg-gradient-primary text-base font-semibold shadow-md"
            >
              Weiter
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={loading}
              className="h-12 flex-1 rounded-xl bg-gradient-primary text-base font-semibold shadow-md"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <PartyPopper className="mr-2 h-5 w-5" />
                  Fertig!
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
