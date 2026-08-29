'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, Profile, UserMemory } from './client';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  memory: UserMemory | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  refreshMemory: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  memory: null,
  loading: true,
  refreshProfile: async () => {},
  refreshMemory: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memory, setMemory] = useState<UserMemory | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    setProfile(data as Profile | null);
  }, []);

  const loadMemory = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('user_memory')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();
    setMemory(data as UserMemory | null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const refreshMemory = useCallback(async () => {
    if (session?.user?.id) await loadMemory(session.user.id);
  }, [session, loadMemory]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setMemory(null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        Promise.all([loadProfile(session.user.id), loadMemory(session.user.id)]).finally(() =>
          setLoading(false)
        );
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user?.id) {
          await Promise.all([loadProfile(session.user.id), loadMemory(session.user.id)]);
        } else {
          setProfile(null);
          setMemory(null);
        }
        setLoading(false);
      })();
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfile, loadMemory]);

  return (
    <AuthContext.Provider
      value={{ session, user, profile, memory, loading, refreshProfile, refreshMemory, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
