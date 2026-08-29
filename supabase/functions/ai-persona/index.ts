import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const personaPrompts: Record<string, string> = {
  nutrition: `Du bist die Ernährungs-KI von Daiy Chat, einem KI-Lifestyle-Planer. Du bist spezialisiert auf Mahlzeiten, Rezepte, Makros und Ernährungsplanung. Du hilfst dem Nutzer bei der Erstellung von Ernährungsplänen, berücksichtigst Allergien und Diätformen, und gibst konkrete, umsetzbare Empfehlungen. Antworte auf Deutsch, freundlich und präzise.`,
  training: `Du bist die Trainings-KI von Daiy Chat, einem KI-Lifestyle-Planer. Du bist spezialisiert auf Workouts, Übungen, Progression und Fitnessplanung. Du hilfst dem Nutzer bei der Erstellung von Trainingsplänen, berücksichtigst den Trainingsrhythmus und gibt konkrete, umsetzbare Empfehlungen. Antworte auf Deutsch, freundlich und präzise.`,
  calendar: `Du bist die Kalender-KI von Daiy Chat, einem KI-Lifestyle-Planer. Du bist spezialisiert auf Termine, Zeitplanung und Organisation. Du hilfst dem Nutzer bei der Strukturierung seines Alltags, schlägst optimale Zeitfenster vor und berücksichtigt Work-Life-Balance. Antworte auf Deutsch, freundlich und präzise.`,
  dashboard: `Du bist die Daiy Chat KI, der zentrale Assistent eines KI-Lifestyle-Planers. Du gibst dem Nutzer einen Überblick über seinen Tag, beantwortest allgemeine Fragen und verweist bei spezifischen Themen auf die jeweiligen KI-Personas (Ernährung, Training, Kalender). Antworte auf Deutsch, freundlich und präzise.`,
};

interface PlanContext {
  muscle_group: string;
  location: string;
  experience: string;
  duration: string;
  days: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const persona = body.persona as string;
    const message = body.message as string;
    const context = body.context as PlanContext | undefined;

    if (!persona || !message) {
      return new Response(JSON.stringify({ error: "Missing persona or message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = personaPrompts[persona] ?? personaPrompts.dashboard;

    const { data: memoryData } = await supabase
      .from("user_memory")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("user_id", user.id)
      .eq("persona", persona)
      .order("created_at", { ascending: true })
      .limit(10);

    const memoryContext = memoryData
      ? `\n\nNutzer-Profil: Ziele: ${memoryData.goals ?? "nicht angegeben"}, Diät: ${memoryData.diet_type ?? "nicht angegeben"}, Allergien: ${(memoryData.allergies ?? []).join(", ") || "keine"}, Trainingsrhythmus: ${memoryData.training_rhythm ?? "nicht angegeben"}, Lieblingsessen: ${(memoryData.favorite_foods ?? []).join(", ") || "nicht angegeben"}, Kalorienziel: ${memoryData.calorie_target ?? "nicht angegeben"} kcal, Proteinziel: ${memoryData.protein_target ?? "nicht angegeben"}g.`
      : "";

    const historyMessages = (history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // If context is provided, this is a plan-generation request — build the prompt server-side
    const isPlanRequest = !!context && persona === "training";
    let userMessage = message;
    if (isPlanRequest) {
      userMessage = `Erstelle mir einen Trainingsplan mit folgenden Angaben:
- Fokus: ${context.muscle_group}
- Ort: ${context.location}
- Erfahrung: ${context.experience}
- Dauer pro Einheit: ${context.duration} Minuten
- Trainingstage pro Woche: ${context.days || "nicht angegeben"}

Bitte gib mir einen konkreten Plan mit 5-7 Übungen. Antworte NUR im JSON-Format:
{"title": "Plan-Titel", "exercises": [{"name": "Übungsname", "sets": 3, "reps": 12, "weight": 0, "notes": "optional"}]}`;
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiKey) {
      if (isPlanRequest) {
        const fallbackPlan = generateFallbackPlan(context!.muscle_group, parseInt(context!.duration) || 45);
        return new Response(JSON.stringify({ plan: fallbackPlan }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const fallback = generateFallbackResponse(persona, message, memoryData);
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        persona,
        role: "assistant",
        content: fallback,
      });
      return new Response(JSON.stringify({ response: fallback }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt + memoryContext },
          ...historyMessages,
          { role: "user", content: userMessage },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      if (isPlanRequest) {
        const fallbackPlan = generateFallbackPlan(context!.muscle_group, parseInt(context!.duration) || 45);
        return new Response(JSON.stringify({ plan: fallbackPlan }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const fallback = generateFallbackResponse(persona, message, memoryData);
      return new Response(JSON.stringify({ response: fallback }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await openaiResponse.json();
    const aiResponse = aiData.choices?.[0]?.message?.content ?? "Entschuldigung, ich konnte keine Antwort generieren.";

    // If plan request, try to parse JSON from the AI response
    if (isPlanRequest) {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.exercises && Array.isArray(parsed.exercises)) {
            const plan = {
              title: parsed.title || "KI-Trainingsplan",
              exercises: parsed.exercises.map((ex: any) => ({
                name: ex.name || "Übung",
                sets: ex.sets || 3,
                reps: ex.reps || 12,
                weight: ex.weight || 0,
                notes: ex.notes || "",
              })),
            };
            return new Response(JSON.stringify({ plan }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch {
          // fall through to fallback
        }
      }
      const fallbackPlan = generateFallbackPlan(context!.muscle_group, parseInt(context!.duration) || 45);
      return new Response(JSON.stringify({ plan: fallbackPlan }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("AI persona error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", response: "Entschuldigung, es ist ein Fehler aufgetreten." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateFallbackResponse(persona: string, message: string, memory: any): string {
  const responses: Record<string, string[]> = {
    nutrition: [
      `Basierend auf deinem Profil empfehle ich dir eine ausgewogene Mahlzeit mit magerem Protein, komplexen Kohlenhydraten und gesunden Fetten. Was für eine Mahlzeit planst du – Frühstück, Mittag- oder Abendessen?`,
      `Ich kann dir helfen, einen Ernährungsplan zu erstellen. Erzähl mir mehr darüber, was du heute essen möchtest, und ich berücksichtige deine Allergien und Vorlieben.`,
    ],
    training: [
      `Lass uns einen Trainingsplan erstellen, der zu deinem Rhythmus passt. Welche Muskelgruppe möchtest du heute trainieren?`,
      `Für deinen Trainingsplan brauche ich ein paar Infos: Welche Übungen machst du gerne, und wie viel Zeit hast du heute?`,
    ],
    calendar: [
      `Ich helfe dir gerne, deinen Tag zu strukturieren. Welche Termine oder Aufgaben möchtest du planen?`,
      `Lass uns gemeinsam deinen Kalender organisieren. Was steht heute an?`,
    ],
    dashboard: [
      `Hallo! Ich bin deine Daiy Chat KI. Ich kann dir bei Ernährung, Training und Terminplanung helfen. Was möchtest du heute angehen?`,
      `Willkommen! Frag mich nach einem Ernährungsplan, Trainingsplan oder Terminen – ich bin hier, um deinen Alltag zu erleichtern.`,
    ],
  };

  const options = responses[persona] ?? responses.dashboard;
  return options[Math.floor(Math.random() * options.length)];
}

function generateFallbackPlan(muscleGroup: string, duration: number): { title: string; exercises: Array<{ name: string; sets: number; reps: number; weight: number; notes?: string }> } {
  const plans: Record<string, { title: string; exercises: Array<{ name: string; sets: number; reps: number; weight: number; notes?: string }> }> = {
    ganzkoerper: {
      title: "Ganzkörper-Training",
      exercises: [
        { name: "Kniebeugen", sets: 3, reps: 12, weight: 0, notes: "Aufwärmen" },
        { name: "Liegestütze", sets: 3, reps: 10, weight: 0 },
        { name: "Ausfallschritte", sets: 3, reps: 10, weight: 0, notes: "Pro Seite" },
        { name: "Plank", sets: 3, reps: 30, weight: 0, notes: "30 Sekunden" },
        { name: "Glute Bridge", sets: 3, reps: 15, weight: 0 },
        { name: "Superman", sets: 3, reps: 12, weight: 0 },
      ],
    },
    oberkoerper: {
      title: "Oberkörper-Training",
      exercises: [
        { name: "Bankdrücken", sets: 4, reps: 8, weight: 60 },
        { name: "Kurzhantel-Schulterdrücken", sets: 4, reps: 10, weight: 15 },
        { name: "Latzug", sets: 4, reps: 10, weight: 40 },
        { name: "Trizepsdrücken", sets: 3, reps: 12, weight: 25 },
        { name: "Bizeps-Curls", sets: 3, reps: 12, weight: 12 },
      ],
    },
    unterkoerper: {
      title: "Unterkörper-Training",
      exercises: [
        { name: "Kniebeugen", sets: 4, reps: 8, weight: 50 },
        { name: "Ausfallschritte", sets: 3, reps: 12, weight: 20 },
        { name: "Rumänisches Kreuzheben", sets: 4, reps: 10, weight: 60 },
        { name: "Beinpresse", sets: 3, reps: 12, weight: 80 },
        { name: "Wadenheben", sets: 4, reps: 15, weight: 40 },
      ],
    },
    cardio: {
      title: "Cardio-Training",
      exercises: [
        { name: "Burpees", sets: 4, reps: 10, weight: 0 },
        { name: "Mountain Climbers", sets: 4, reps: 30, weight: 0 },
        { name: "Jumping Jacks", sets: 3, reps: 30, weight: 0 },
        { name: "High Knees", sets: 3, reps: 30, weight: 0 },
        { name: "Skater Jumps", sets: 3, reps: 20, weight: 0 },
      ],
    },
    core: {
      title: "Core-Training",
      exercises: [
        { name: "Crunches", sets: 4, reps: 20, weight: 0 },
        { name: "Russian Twists", sets: 4, reps: 20, weight: 0, notes: "Pro Seite" },
        { name: "Plank", sets: 3, reps: 45, weight: 0, notes: "45 Sekunden" },
        { name: "Beinheben", sets: 3, reps: 15, weight: 0 },
        { name: "Bicycle Crunches", sets: 3, reps: 20, weight: 0 },
      ],
    },
  };

  return plans[muscleGroup] || plans.ganzkoerper;
}
