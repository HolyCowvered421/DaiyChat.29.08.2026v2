'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Flame, TrendingDown, TrendingUp, Beef, Wheat, Droplet, Calculator, Activity } from 'lucide-react';

type Gender = 'male' | 'female';
type Goal = 'lose' | 'maintain' | 'gain';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

const activityMultipliers: Record<ActivityLevel, { label: string; factor: number }> = {
  sedentary: { label: 'Sitzend (kaum Bewegung)', factor: 1.2 },
  light: { label: 'Leicht aktiv (1-3x/Woche)', factor: 1.375 },
  moderate: { label: 'Moderat (3-5x/Woche)', factor: 1.55 },
  active: { label: 'Aktiv (6-7x/Woche)', factor: 1.725 },
  very_active: { label: 'Sehr aktiv (Sport + Beruf)', factor: 1.9 },
};

export function CalorieCalculator() {
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<Goal>('lose');
  const [results, setResults] = useState<{
    bmr: number;
    tdee: number;
    targetCalories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);

  const calculate = () => {
    const ageNum = parseInt(age);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);
    if (!ageNum || !weightNum || !heightNum) return;

    // Mifflin-St Jeor Formula
    const bmr =
      gender === 'male'
        ? 10 * weightNum + 6.25 * heightNum - 5 * ageNum + 5
        : 10 * weightNum + 6.25 * heightNum - 5 * ageNum - 161;

    const tdee = bmr * activityMultipliers[activity].factor;

    let targetCalories: number;
    if (goal === 'lose') {
      targetCalories = Math.round(tdee * 0.8); // 20% deficit
    } else if (goal === 'gain') {
      targetCalories = Math.round(tdee * 1.1); // 10% surplus
    } else {
      targetCalories = Math.round(tdee);
    }

    // Macros: 30% protein, 40% carbs, 30% fat
    const protein = Math.round((targetCalories * 0.3) / 4);
    const carbs = Math.round((targetCalories * 0.4) / 4);
    const fat = Math.round((targetCalories * 0.3) / 9);

    setResults({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories,
      protein,
      carbs,
      fat,
    });
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div className="bg-gradient-training p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-jakarta text-base font-bold text-white">Kalorien- & Makrorechner</h3>
              <p className="mt-1 text-xs text-white/80 leading-relaxed">
                Berechne deinen Kalorienbedarf, Eiweißbedarf und dein Ziel-Defizit oder Surplus.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          {/* Gender */}
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Geschlecht</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['male', 'female'] as Gender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                    gender === g
                      ? 'border-training bg-training/5 text-training'
                      : 'border-border bg-card text-muted-foreground hover:border-training/30'
                  }`}
                >
                  {g === 'male' ? 'Männlich' : 'Weiblich'}
                </button>
              ))}
            </div>
          </div>

          {/* Age, Weight, Height */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="mb-1 block text-xs font-semibold text-muted-foreground">Alter</Label>
              <Input
                type="number"
                placeholder="25"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-muted-foreground">Gewicht (kg)</Label>
              <Input
                type="number"
                placeholder="75"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-semibold text-muted-foreground">Größe (cm)</Label>
              <Input
                type="number"
                placeholder="180"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Aktivitätslevel</Label>
            <div className="space-y-1.5">
              {(Object.keys(activityMultipliers) as ActivityLevel[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setActivity(key)}
                  className={`flex w-full items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-xs font-medium transition-all ${
                    activity === key
                      ? 'border-training bg-training/5 text-training'
                      : 'border-border bg-card text-muted-foreground hover:border-training/30'
                  }`}
                >
                  <Activity className="h-3.5 w-3.5 shrink-0" />
                  {activityMultipliers[key].label}
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div>
            <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Ziel</Label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'lose' as Goal, label: 'Abnehmen', icon: TrendingDown },
                { id: 'maintain' as Goal, label: 'Halten', icon: Flame },
                { id: 'gain' as Goal, label: 'Zunehmen', icon: TrendingUp },
              ]).map((g) => {
                const Icon = g.icon;
                return (
                  <button
                    key={g.id}
                    onClick={() => setGoal(g.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-xs font-semibold transition-all ${
                      goal === g.id
                        ? 'border-training bg-training/5 text-training'
                        : 'border-border bg-card text-muted-foreground hover:border-training/30'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            onClick={calculate}
            className="h-11 w-full rounded-xl bg-gradient-training text-sm font-semibold shadow-md"
            disabled={!age || !weight || !height}
          >
            <Calculator className="mr-2 h-4 w-4" />
            Berechnen
          </Button>
        </div>
      </Card>

      {results && (
        <div className="space-y-3 animate-slide-up">
          {/* Calorie Results */}
          <Card className="p-4 shadow-sm">
            <h4 className="mb-3 font-jakarta text-sm font-bold">Dein Kalorienbedarf</h4>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">Grundumsatz (BMR)</span>
                <span className="text-sm font-bold">{results.bmr} kcal</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">Gesamtumsatz (TDEE)</span>
                <span className="text-sm font-bold">{results.tdee} kcal</span>
              </div>
              <div className={`flex items-center justify-between rounded-xl px-3 py-3 ${
                goal === 'lose' ? 'bg-destructive/10' : goal === 'gain' ? 'bg-success/10' : 'bg-primary/10'
              }`}>
                <span className="flex items-center gap-1.5 text-xs font-semibold">
                  {goal === 'lose' && <TrendingDown className="h-4 w-4 text-destructive" />}
                  {goal === 'gain' && <TrendingUp className="h-4 w-4 text-success" />}
                  {goal === 'maintain' && <Flame className="h-4 w-4 text-primary" />}
                  {goal === 'lose' ? 'Kaloriendefizit' : goal === 'gain' ? 'Kaloriensurplus' : 'Erhalt'}
                </span>
                <span className={`text-lg font-bold ${
                  goal === 'lose' ? 'text-destructive' : goal === 'gain' ? 'text-success' : 'text-primary'
                }`}>
                  {results.targetCalories} kcal
                </span>
              </div>
            </div>
          </Card>

          {/* Macro Results */}
          <Card className="p-4 shadow-sm">
            <h4 className="mb-3 font-jakarta text-sm font-bold">Makro-Verteilung</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-1.5 rounded-xl bg-training/5 p-3">
                <Beef className="h-5 w-5 text-training" />
                <span className="text-lg font-bold text-training">{results.protein}g</span>
                <span className="text-[10px] text-muted-foreground">Eiweiß (30%)</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl bg-warning/5 p-3">
                <Wheat className="h-5 w-5 text-warning" />
                <span className="text-lg font-bold text-warning">{results.carbs}g</span>
                <span className="text-[10px] text-muted-foreground">Kohlenhydrate (40%)</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 rounded-xl bg-dashboard/5 p-3">
                <Droplet className="h-5 w-5 text-dashboard" />
                <span className="text-lg font-bold text-dashboard">{results.fat}g</span>
                <span className="text-[10px] text-muted-foreground">Fett (30%)</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
