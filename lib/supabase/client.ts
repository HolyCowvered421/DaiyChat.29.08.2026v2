import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type UserMemory = {
  id: string;
  user_id: string;
  goals: string | null;
  allergies: string[];
  diet_type: string | null;
  training_rhythm: string | null;
  favorite_foods: string[];
  calorie_target: number | null;
  protein_target: number | null;
  carbs_target: number | null;
  fat_target: number | null;
  created_at: string;
  updated_at: string;
};

export type Meal = {
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  ingredients: string[];
  image_url?: string;
};

export type MealPlan = {
  id: string;
  user_id: string;
  date: string;
  meals: Meal[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  created_at: string;
  updated_at: string;
};

export type SavedRecipe = {
  id: string;
  user_id: string;
  name: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  ingredients: string[];
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type MealPlanEntry = {
  id: string;
  user_id: string;
  date: string;
  recipe_id: string | null;
  name: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  ingredients: string[];
  image_url: string | null;
  created_at: string;
};

export type Exercise = {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  notes?: string;
  completedSets?: boolean[];
};

export type WorkoutPlan = {
  id: string;
  user_id: string;
  date: string;
  title: string;
  exercises: Exercise[];
  duration_minutes: number | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export type EventType = 'work' | 'school' | 'training' | 'leisure' | 'meal' | 'appointment';

export type EventColor = 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'teal';

export type Attachment = {
  name: string;
  url: string;
};

export type Event = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  start_time: string;
  end_time: string;
  location: string | null;
  color: EventColor | null;
  attachments: Attachment[] | null;
  linked_workout_id: string | null;
  linked_meal_plan_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Persona = 'nutrition' | 'training' | 'calendar' | 'dashboard';

export type ChatMessage = {
  id: string;
  user_id: string;
  persona: Persona;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};
