'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Mail, Lock, User, Loader as Loader2, ArrowRight, Check, CircleAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validateName = (value: string): string | null => {
    if (value.length < 6) return 'Name muss mindestens 6 Zeichen lang sein';
    if (value.length > 15) return 'Name darf maximal 15 Zeichen lang sein';
    return null;
  };

  const validateEmail = (value: string): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Bitte gib eine gültige E-Mail-Adresse ein';
    return null;
  };

  const validatePassword = (value: string): string | null => {
    if (value.length < 8) return 'Passwort muss mindestens 8 Zeichen lang sein';
    if (!/\d/.test(value)) return 'Passwort muss mindestens 1 Zahl enthalten';
    return null;
  };

  const nameError = validateName(name);
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nameError) {
      toast.error(nameError);
      return;
    }
    if (emailError) {
      toast.error(emailError);
      return;
    }
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    setLoading(false);
    if (error) {
      let msg = error.message;
      if (error.message.includes('already') || error.message.includes('registered') || error.message.includes('User already')) {
        msg = 'Diese E-Mail-Adresse ist bereits registriert. Versuche dich einzuloggen.';
      } else if (error.message.includes('weak') || error.message.includes('password') || error.message.includes('pwned')) {
        msg = 'Dieses Passwort ist zu schwach oder zu bekannt. Bitte wähle ein stärkeres Passwort mit Groß-/Kleinbuchstaben, Zahlen und Sonderzeichen.';
      } else if (error.message.includes('email')) {
        msg = 'Ungültige E-Mail-Adresse. Bitte überprüfe deine Eingabe.';
      }
      toast.error(msg);
      return;
    }
    if (data.user) {
      toast.success('Konto erstellt! Willkommen bei Daiy Chat.');
      router.push('/onboarding');
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-background via-background to-accent/5">
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow-primary">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h1 className="font-jakarta text-2xl font-bold tracking-tight">Konto erstellen</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Starte deine Reise zu einem besseren Alltag
              </p>
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4 animate-slide-up">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-semibold">
                Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="6–15 Zeichen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`h-12 rounded-xl pl-10 pr-10 ${name && nameError ? 'border-destructive' : name && !nameError ? 'border-success' : ''}`}
                  minLength={6}
                  maxLength={15}
                  required
                />
                {name && !nameError && (
                  <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />
                )}
                {name && nameError && (
                  <CircleAlert className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                )}
              </div>
              {name && nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
              {name && !nameError && (
                <p className="text-xs text-success">Name gültig ({name.length}/15 Zeichen)</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">
                E-Mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="beispiel@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`h-12 rounded-xl pl-10 pr-10 ${email && emailError ? 'border-destructive' : email && !emailError ? 'border-success' : ''}`}
                  required
                />
                {email && !emailError && (
                  <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />
                )}
                {email && emailError && (
                  <CircleAlert className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                )}
              </div>
              {email && emailError && (
                <p className="text-xs text-destructive">{emailError}</p>
              )}
              {email && !emailError && (
                <p className="text-xs text-success">E-Mail gültig</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">
                Passwort
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Mindestens 8 Zeichen + 1 Zahl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`h-12 rounded-xl pl-10 pr-10 ${password && passwordError ? 'border-destructive' : password && !passwordError ? 'border-success' : ''}`}
                  required
                />
                {password && !passwordError && (
                  <Check className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />
                )}
                {password && passwordError && (
                  <CircleAlert className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
                )}
              </div>
              {password && passwordError && (
                <p className="text-xs text-destructive">{passwordError}</p>
              )}
              {password && !passwordError && (
                <p className="text-xs text-success">Passwort gültig</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !!nameError || !!emailError || !!passwordError}
              className="h-12 w-full rounded-xl bg-gradient-primary text-base font-semibold shadow-md transition-all hover:shadow-glow-primary"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Registrieren
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">oder mit</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => toast.info('Google Login wird bald verfügbar sein')}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold transition-all hover:bg-muted/50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button
              onClick={() => toast.info('Apple Login wird bald verfügbar sein')}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold transition-all hover:bg-muted/50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Apple
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Bereits ein Konto?{' '}
            <button
              onClick={() => router.push('/auth/login')}
              className="font-semibold text-primary hover:underline"
            >
              Einloggen
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
