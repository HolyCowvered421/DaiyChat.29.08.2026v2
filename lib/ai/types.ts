export type PersonaId = 'nutrition' | 'training' | 'calendar' | 'dashboard';

export type AIStatus = 'active' | 'maintenance';

export type AIStatusEntry = {
  ai_id: PersonaId;
  status: AIStatus;
  maintenance_message: string | null;
};

export type AIStatusMap = Partial<Record<PersonaId, AIStatusEntry>>;

export type OutgoingChatRequest = {
  message: string;
  ai_id: PersonaId;
  location_id?: string;
};

export type OutgoingChatResponse = {
  response: string;
  ai_id: PersonaId;
};

export type OutgoingPlanRequest = {
  message: string;
  ai_id: 'training';
  context: {
    muscle_group: string;
    location: string;
    experience: string;
    duration: string;
    days: string;
  };
};

export type GeneratedPlan = {
  title: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: number;
    weight: number;
    notes?: string;
  }>;
};

export type OutgoingPlanResponse = {
  plan: GeneratedPlan | null;
  ai_id: 'training';
};
