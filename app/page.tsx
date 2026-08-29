'use client';

import { useAuth } from '@/lib/supabase/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { TopHeader } from '@/components/layout/top-header';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/auth/login');
    } else if (!profile?.onboarding_completed) {
      router.replace('/onboarding');
    } else {
      router.replace('/dashboard');
    }
    setChecking(false);
  }, [session, profile, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/50">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow-primary">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">Daiy Chat wird geladen…</p>
      </div>
    </div>
  );
}
