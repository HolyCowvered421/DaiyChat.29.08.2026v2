'use client';

import { useAuth } from '@/lib/supabase/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { BottomNav } from '@/components/layout/bottom-nav';
import { TopHeader } from '@/components/layout/top-header';
import { Loader2 } from 'lucide-react';

export function AppShell({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/auth/login');
    } else if (!profile?.onboarding_completed) {
      router.replace('/onboarding');
    }
  }, [session, profile, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || !profile?.onboarding_completed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#080d1c] via-[#0b1428] to-[#122442]">
      <TopHeader />
      <main className="mx-auto max-w-[480px] px-4 pb-28 pt-2">{children}</main>
      <BottomNav />
    </div>
  );
}
