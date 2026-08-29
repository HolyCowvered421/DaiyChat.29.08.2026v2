'use client';

import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/lib/supabase/auth-context';
import { supabase, SavedRecipe, MealPlanEntry } from '@/lib/supabase/client';
import { AIChat } from '@/components/ai/ai-chat';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Flame, Beef, Wheat, Droplet, Leaf, UtensilsCrossed,
  Plus, Trash2, ChevronLeft, ChevronRight, Bookmark,
  X, Pencil, Check,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import {
  format, addDays, subDays, startOfWeek, isToday, parseISO,
  subWeeks, eachDayOfInterval,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend,
} from 'recharts';

const mealTypeLabels: Record<string, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snack',
};

const mealTypeColors: Record<string, string> = {
  breakfast: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  lunch: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  dinner: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  snack: 'bg-green-500/10 text-green-600 border-green-500/20',
};

const mealDotColors: Record<string, string> = {
  breakfast: 'bg-yellow-500',
  lunch: 'bg-orange-500',
  dinner: 'bg-teal-500',
  snack: 'bg-green-500',
};

const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function NutritionPage() {
  return (
    <AppShell>
      <NutritionContent />
    </AppShell>
  );
}

function NutritionContent() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState('essen');
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [weekEntries, setWeekEntries] = useState<MealPlanEntry[]>([]);
  const [weekLoading, setWeekLoading] = useState(true);
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<SavedRecipe | null>(null);

  // 7-day window starting today
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = addDays(weekStart, 6);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const todayStr = format(weekStart, 'yyyy-MM-dd');

  const loadWeekEntries = useCallback(async () => {
    if (!session?.user?.id) return;
    setWeekLoading(true);
    const { data } = await supabase
      .from('meal_plan_entries')
      .select('*')
      .eq('user_id', session.user.id)
      .gte('date', todayStr)
      .lte('date', format(weekEnd, 'yyyy-MM-dd'))
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });
    setWeekEntries((data as MealPlanEntry[]) || []);
    setWeekLoading(false);
  }, [session?.user?.id, todayStr, format(weekEnd, 'yyyy-MM-dd')]);

  const loadRecipes = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('saved_recipes')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    setRecipes((data as SavedRecipe[]) || []);
  }, [session?.user?.id]);

  useEffect(() => { loadWeekEntries(); }, [loadWeekEntries]);
  useEffect(() => { loadRecipes(); }, [loadRecipes]);

  // Chart data
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartWeekStart, setChartWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const loadChartData = useCallback(async () => {
    if (!session?.user?.id) return;
    setChartLoading(true);
    const chartStart = subWeeks(chartWeekStart, 3);
    const chartEnd = addDays(chartWeekStart, 6);
    const { data } = await supabase
      .from('meal_plan_entries')
      .select('date, calories, protein, carbs, fat, fiber')
      .eq('user_id', session.user.id)
      .gte('date', format(chartStart, 'yyyy-MM-dd'))
      .lte('date', format(chartEnd, 'yyyy-MM-dd'))
      .order('date', { ascending: true });

    const rows = (data as any[]) || [];
    const byDay: Record<string, { calories: number; protein: number; carbs: number; fat: number; fiber: number }> = {};
    for (const r of rows) {
      if (!byDay[r.date]) byDay[r.date] = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      byDay[r.date].calories += r.calories || 0;
      byDay[r.date].protein += r.protein || 0;
      byDay[r.date].carbs += r.carbs || 0;
      byDay[r.date].fat += r.fat || 0;
      byDay[r.date].fiber += r.fiber || 0;
    }

    const weeks: any[] = [];
    for (let w = 3; w >= 0; w--) {
      const ws = subWeeks(chartWeekStart, w);
      const we = addDays(ws, 6);
      const days = eachDayOfInterval({ start: ws, end: we });
      let totalCal = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0, totalFiber = 0;
      let dayCount = 0;
      for (const d of days) {
        const ds = format(d, 'yyyy-MM-dd');
        if (byDay[ds]) {
          totalCal += byDay[ds].calories;
          totalProtein += byDay[ds].protein;
          totalCarbs += byDay[ds].carbs;
          totalFat += byDay[ds].fat;
          totalFiber += byDay[ds].fiber;
          dayCount++;
        }
      }
      const avg = dayCount > 0 ? dayCount : 1;
      weeks.push({
        label: w === 0 ? 'Diese Woche' : `KW ${format(ws, 'I')}`,
        kcal: Math.round(totalCal / avg),
        protein: Math.round(totalProtein / avg),
        carbs: Math.round(totalCarbs / avg),
        fat: Math.round(totalFat / avg),
        fiber: Math.round(totalFiber / avg),
        days: dayCount,
      });
    }
    setChartData(weeks);
    setChartLoading(false);
  }, [session?.user?.id, format(chartWeekStart, 'yyyy-MM-dd')]);

  useEffect(() => { loadChartData(); }, [loadChartData]);

  // Today's entries + totals
  const todayEntries = weekEntries.filter((e) => e.date === todayStr);
  const dayTotals = todayEntries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein: acc.protein + (e.protein || 0),
      carbs: acc.carbs + (e.carbs || 0),
      fat: acc.fat + (e.fat || 0),
      fiber: acc.fiber + (e.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );

  const handleAddEntryToDate = async (recipe: SavedRecipe, date: string) => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase.from('meal_plan_entries').insert({
      user_id: session.user.id,
      date,
      recipe_id: recipe.id,
      name: recipe.name,
      meal_type: recipe.meal_type,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      fiber: recipe.fiber,
      ingredients: recipe.ingredients,
      image_url: recipe.image_url,
    }).select().single();

    if (!error && data) {
      setWeekEntries([...weekEntries, data as MealPlanEntry]);
      loadChartData();
      toast.success(`${recipe.name} hinzugefügt!`);
    } else {
      toast.error('Fehler beim Hinzufügen');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const { error } = await supabase.from('meal_plan_entries').delete().eq('id', id);
    if (!error) {
      setWeekEntries(weekEntries.filter((e) => e.id !== id));
      loadChartData();
      toast.success('Eintrag gelöscht');
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    const { error } = await supabase.from('saved_recipes').delete().eq('id', id);
    if (!error) {
      setRecipes(recipes.filter((r) => r.id !== id));
      toast.success('Rezept gelöscht');
    }
  };

  const handleSaveRecipe = async (recipe: Partial<SavedRecipe>) => {
    if (!session?.user?.id) return;
    const isEditing = !!editingRecipe;
    const payload = {
      user_id: session.user.id,
      name: recipe.name || 'Neues Rezept',
      meal_type: recipe.meal_type || 'lunch',
      calories: recipe.calories || 0,
      protein: recipe.protein || 0,
      carbs: recipe.carbs || 0,
      fat: recipe.fat || 0,
      fiber: recipe.fiber || 0,
      ingredients: recipe.ingredients || [],
    };

    if (isEditing) {
      const { error } = await supabase.from('saved_recipes').update(payload).eq('id', editingRecipe!.id);
      if (!error) { toast.success('Rezept aktualisiert!'); loadRecipes(); }
      else toast.error('Fehler beim Speichern');
    } else {
      const { error } = await supabase.from('saved_recipes').insert(payload);
      if (!error) { toast.success('Rezept gespeichert!'); loadRecipes(); }
      else toast.error('Fehler beim Speichern');
    }
    setShowRecipeDialog(false);
    setEditingRecipe(null);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="font-jakarta text-2xl font-bold tracking-tight">Ernährung</h2>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE, d. MMMM yyyy', { locale: de })}
        </p>
      </div>

      {/* Macro Summary — always visible */}
      <Card className="overflow-hidden border-border/60 p-4 shadow-sm">
        <div className="grid grid-cols-5 gap-2">
          <div className="flex flex-col items-center gap-1 rounded-xl bg-nutrition/5 p-2">
            <Flame className="h-4 w-4 text-nutrition" />
            <span className="text-sm font-bold">{dayTotals.calories}</span>
            <span className="text-[9px] text-muted-foreground">kcal</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-training/5 p-2">
            <Beef className="h-4 w-4 text-training" />
            <span className="text-sm font-bold">{dayTotals.protein}g</span>
            <span className="text-[9px] text-muted-foreground">Eiweiß</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-warning/5 p-2">
            <Wheat className="h-4 w-4 text-warning" />
            <span className="text-sm font-bold">{dayTotals.carbs}g</span>
            <span className="text-[9px] text-muted-foreground">Carbs</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-dashboard/5 p-2">
            <Droplet className="h-4 w-4 text-dashboard" />
            <span className="text-sm font-bold">{dayTotals.fat}g</span>
            <span className="text-[9px] text-muted-foreground">Fett</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-success/5 p-2">
            <Leaf className="h-4 w-4 text-success" />
            <span className="text-sm font-bold">{dayTotals.fiber}g</span>
            <span className="text-[9px] text-muted-foreground">Ballst.</span>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 rounded-xl">
          <TabsTrigger value="essen" className="text-xs">Essen</TabsTrigger>
          <TabsTrigger value="recipes" className="text-xs">Rezepte</TabsTrigger>
          <TabsTrigger value="charts" className="text-xs">Diagramme</TabsTrigger>
        </TabsList>

        {/* Essen Tab — today large, next 6 days compact */}
        <TabsContent value="essen" className="space-y-4 mt-4">
          {weekLoading ? (
            <div className="space-y-3">
              <div className="h-32 animate-shimmer rounded-2xl" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-shimmer rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {/* TODAY — large featured card */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-nutrition" />
                  <h3 className="font-jakarta text-lg font-bold">Heute</h3>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(), 'EEEE, d. MMMM', { locale: de })}
                  </span>
                </div>

                {todayEntries.length > 0 ? (
                  <div className="space-y-2">
                    {mealOrder.map((mt) => {
                      const meals = todayEntries.filter((e) => e.meal_type === mt);
                      if (meals.length === 0) return null;
                      return (
                        <div key={mt} className="space-y-1.5">
                          <h4 className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground px-1">
                            {mealTypeLabels[mt]}
                          </h4>
                          {meals.map((entry) => (
                            <MealEntryCard
                              key={entry.id}
                              entry={entry}
                              onDelete={() => handleDeleteEntry(entry.id)}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center border-dashed border-2 border-nutrition/20">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-nutrition/10">
                      <UtensilsCrossed className="h-8 w-8 text-nutrition" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Kein Essen für heute geplant</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Füge gespeicherte Rezepte hinzu oder frag die Ernährungs-KI
                      </p>
                    </div>
                  </Card>
                )}

                {/* Quick add from saved recipes */}
                {recipes.length > 0 && (
                  <div className="mt-3">
                    <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground px-1">
                      Schnell hinzufügen
                    </h4>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
                      {recipes.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => handleAddEntryToDate(r, todayStr)}
                          className="flex min-w-[120px] flex-col gap-1 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-nutrition/40"
                        >
                          <span className="text-xs font-semibold truncate">{r.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {r.calories} kcal · {mealTypeLabels[r.meal_type]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* NEXT 6 DAYS — compact */}
              <div>
                <h3 className="mb-2 font-jakarta text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Diese Woche
                </h3>
                <div className="space-y-2">
                  {weekDays.slice(1).map((day) => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const dayEntries = weekEntries.filter((e) => e.date === dayStr);
                    const dayCal = dayEntries.reduce((s, e) => s + (e.calories || 0), 0);

                    return (
                      <Card key={dayStr} className="p-3 shadow-sm">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">
                              {format(day, 'EEEEEE', { locale: de })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(day, 'd.M.', { locale: de })}
                            </span>
                          </div>
                          {dayCal > 0 && (
                            <Badge variant="secondary" className="text-[10px]">
                              {dayCal} kcal
                            </Badge>
                          )}
                        </div>

                        {dayEntries.length > 0 ? (
                          <div className="space-y-1.5">
                            {dayEntries.map((e) => (
                              <div
                                key={e.id}
                                className="flex items-center gap-2 rounded-lg bg-muted/30 px-2.5 py-2"
                              >
                                <div className={`h-2 w-2 rounded-full ${mealDotColors[e.meal_type] || 'bg-green-500'}`} />
                                <span className="flex-1 text-xs font-medium truncate">{e.name}</span>
                                <span className="text-[10px] text-muted-foreground">{e.calories} kcal</span>
                                <button
                                  onClick={() => handleDeleteEntry(e.id)}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground py-1">Nichts geplant</p>
                        )}

                        {/* Add recipe buttons for this day */}
                        {recipes.length > 0 && (
                          <div className="mt-2 flex gap-1.5 flex-wrap">
                            {recipes.slice(0, 4).map((r) => (
                              <button
                                key={r.id}
                                onClick={() => handleAddEntryToDate(r, dayStr)}
                                className="flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-[10px] text-muted-foreground transition-all hover:border-nutrition/40 hover:text-nutrition"
                              >
                                <Plus className="h-2.5 w-2.5" />
                                {r.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/* Recipes Tab */}
        <TabsContent value="recipes" className="space-y-3 mt-4">
          <Button
            onClick={() => { setEditingRecipe(null); setShowRecipeDialog(true); }}
            className="w-full h-11 rounded-xl bg-gradient-nutrition text-sm font-semibold shadow-md"
          >
            <Plus className="mr-2 h-4 w-4" />
            Neues Rezept speichern
          </Button>

          {recipes.length > 0 ? (
            <div className="space-y-2">
              {recipes.map((r) => (
                <Card key={r.id} className="overflow-hidden border-border/60 shadow-sm animate-slide-up">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold">{r.name}</h4>
                        <Badge className={`mt-1 border ${mealTypeColors[r.meal_type]}`}>
                          {mealTypeLabels[r.meal_type]}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setEditingRecipe(r); setShowRecipeDialog(true); }}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecipe(r.id)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 font-semibold">
                        <Flame className="h-3.5 w-3.5 text-nutrition" />
                        {r.calories} kcal
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Beef className="h-3 w-3" />{r.protein}g
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Wheat className="h-3 w-3" />{r.carbs}g
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Droplet className="h-3 w-3" />{r.fat}g
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Leaf className="h-3 w-3" />{r.fiber}g
                      </span>
                    </div>

                    {r.ingredients.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.ingredients.map((ing, i) => (
                          <span key={i} className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                            {ing}
                          </span>
                        ))}
                      </div>
                    )}

                    <Button
                      onClick={() => handleAddEntryToDate(r, todayStr)}
                      size="sm"
                      variant="secondary"
                      className="mt-3 w-full rounded-xl text-xs"
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Für heute hinzufügen
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center border-dashed border-2 border-nutrition/20">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-nutrition/10">
                <Bookmark className="h-8 w-8 text-nutrition" />
              </div>
              <div>
                <p className="text-sm font-semibold">Noch keine Rezepte gespeichert</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Speichere deine Lieblingsrezepte für schnelle Planung
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-3 mt-4">
          {chartLoading ? (
            <div className="h-64 animate-shimmer rounded-2xl" />
          ) : (
            <>
              <Card className="p-4 shadow-sm">
                <h4 className="mb-3 font-jakarta text-sm font-bold flex items-center gap-2">
                  <Flame className="h-4 w-4 text-nutrition" />
                  Kalorien pro Tag (Wochen-Durchschnitt)
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 32% 23% / 0.5)" />
                    <XAxis dataKey="label" tick={{ fill: 'hsl(215 20% 68%)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(215 20% 68%)', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(222 43% 12%)',
                        border: '1px solid hsl(217 32% 23%)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="kcal" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} name="kcal/Tag" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-4 shadow-sm">
                <h4 className="mb-3 font-jakarta text-sm font-bold flex items-center gap-2">
                  <Beef className="h-4 w-4 text-training" />
                  Makros pro Tag (Wochen-Durchschnitt)
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 32% 23% / 0.5)" />
                    <XAxis dataKey="label" tick={{ fill: 'hsl(215 20% 68%)', fontSize: 11 }} />
                    <YAxis tick={{ fill: 'hsl(215 20% 68%)', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(222 43% 12%)',
                        border: '1px solid hsl(217 32% 23%)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="protein" fill="hsl(25 95% 53%)" radius={[4, 4, 0, 0]} name="Eiweiß (g)" />
                    <Bar dataKey="carbs" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} name="Carbs (g)" />
                    <Bar dataKey="fat" fill="hsl(280 65% 60%)" radius={[4, 4, 0, 0]} name="Fett (g)" />
                    <Bar dataKey="fiber" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} name="Ballst. (g)" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                  onClick={() => setChartWeekStart(subDays(chartWeekStart, 7))}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {format(subWeeks(chartWeekStart, 3), 'd.M.', { locale: de })} – {format(addDays(chartWeekStart, 6), 'd.M.yyyy', { locale: de })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                  onClick={() => setChartWeekStart(addDays(chartWeekStart, 7))}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* AI Chat — ALWAYS visible below tabs */}
      <div>
        <h3 className="mb-2.5 font-jakarta text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Ernährungs-KI
        </h3>
        <AIChat persona="nutrition" />
      </div>

      {/* Recipe Dialog */}
      {showRecipeDialog && (
        <RecipeDialog
          recipe={editingRecipe}
          onClose={() => { setShowRecipeDialog(false); setEditingRecipe(null); }}
          onSave={handleSaveRecipe}
        />
      )}
    </div>
  );
}

function MealEntryCard({
  entry,
  onDelete,
}: {
  entry: MealPlanEntry;
  onDelete: () => void;
}) {
  return (
    <Card className="overflow-hidden border-border/60 shadow-sm animate-slide-up">
      <div className="flex items-start gap-3 p-3">
        <div className={`mt-1 h-10 w-1.5 shrink-0 rounded-full ${mealDotColors[entry.meal_type] || 'bg-green-500'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{entry.name}</p>
            <Badge variant="secondary" className={`text-[10px] ${mealTypeColors[entry.meal_type]}`}>
              {mealTypeLabels[entry.meal_type]}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-semibold">
              <Flame className="h-3 w-3 text-nutrition" />
              {entry.calories} kcal
            </span>
            <span className="flex items-center gap-1">
              <Beef className="h-3 w-3" />{entry.protein}g
            </span>
            <span className="flex items-center gap-1">
              <Wheat className="h-3 w-3" />{entry.carbs}g
            </span>
            <span className="flex items-center gap-1">
              <Droplet className="h-3 w-3" />{entry.fat}g
            </span>
            <span className="flex items-center gap-1">
              <Leaf className="h-3 w-3" />{entry.fiber}g
            </span>
          </div>
          {entry.ingredients.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {entry.ingredients.map((ing, i) => (
                <span key={i} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {ing}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </Card>
  );
}

function RecipeDialog({
  recipe,
  onClose,
  onSave,
}: {
  recipe: SavedRecipe | null;
  onClose: () => void;
  onSave: (recipe: Partial<SavedRecipe>) => void;
}) {
  const [name, setName] = useState(recipe?.name || '');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(recipe?.meal_type || 'lunch');
  const [calories, setCalories] = useState(recipe?.calories?.toString() || '');
  const [protein, setProtein] = useState(recipe?.protein?.toString() || '');
  const [carbs, setCarbs] = useState(recipe?.carbs?.toString() || '');
  const [fat, setFat] = useState(recipe?.fat?.toString() || '');
  const [fiber, setFiber] = useState(recipe?.fiber?.toString() || '');
  const [ingredients, setIngredients] = useState<string[]>(recipe?.ingredients || []);
  const [ingredientInput, setIngredientInput] = useState('');

  const addIngredient = () => {
    const trimmed = ingredientInput.trim();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients([...ingredients, trimmed]);
      setIngredientInput('');
    }
  };

  const handleSave = () => {
    if (!name.trim()) { toast.error('Bitte gib einen Namen ein'); return; }
    onSave({
      name: name.trim(),
      meal_type: mealType,
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
      fiber: parseInt(fiber) || 0,
      ingredients,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[480px] max-h-[85vh] flex-col rounded-t-3xl bg-card shadow-2xl animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
          <h3 className="font-jakarta text-lg font-bold">
            {recipe ? 'Rezept bearbeiten' : 'Neues Rezept'}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Name</label>
            <input
              type="text"
              placeholder="z.B. Hähnchen-Reis-Bowl"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus:border-nutrition/40 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Mahlzeit-Typ</label>
            <div className="flex flex-wrap gap-2">
              {mealOrder.map((mt) => (
                <button
                  key={mt}
                  onClick={() => setMealType(mt as any)}
                  className={`rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all ${
                    mealType === mt
                      ? 'border-nutrition bg-nutrition/10 text-nutrition'
                      : 'border-border bg-card text-muted-foreground hover:border-nutrition/30'
                  }`}
                >
                  {mealTypeLabels[mt]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">kcal</label>
              <input type="number" placeholder="500" value={calories} onChange={(e) => setCalories(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-2 text-xs text-center focus:border-nutrition/40 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Eiweiß</label>
              <input type="number" placeholder="40" value={protein} onChange={(e) => setProtein(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-2 text-xs text-center focus:border-nutrition/40 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Carbs</label>
              <input type="number" placeholder="60" value={carbs} onChange={(e) => setCarbs(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-2 text-xs text-center focus:border-nutrition/40 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Fett</label>
              <input type="number" placeholder="15" value={fat} onChange={(e) => setFat(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-2 text-xs text-center focus:border-nutrition/40 focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-muted-foreground">Ballst.</label>
              <input type="number" placeholder="8" value={fiber} onChange={(e) => setFiber(e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-2 text-xs text-center focus:border-nutrition/40 focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Zutaten</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="z.B. Hähnchen, Reis..."
                value={ingredientInput}
                onChange={(e) => setIngredientInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
                className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm focus:border-nutrition/40 focus:outline-none"
              />
              <Button onClick={addIngredient} variant="secondary" size="sm" className="h-10 rounded-xl px-3">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {ingredients.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ingredients.map((ing, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px]">
                    {ing}
                    <button
                      onClick={() => setIngredients(ingredients.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 border-t border-border/50 px-5 py-4 bg-card">
          <Button onClick={onClose} variant="ghost" className="h-11 rounded-xl px-5 text-sm">
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="h-11 flex-1 rounded-xl bg-gradient-nutrition text-sm font-semibold shadow-md"
          >
            <Check className="mr-2 h-4 w-4" />
            {recipe ? 'Speichern' : 'Rezept speichern'}
          </Button>
        </div>
      </div>
    </div>
  );
}
