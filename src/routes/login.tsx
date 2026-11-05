import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/shell";
import { GROK_PROVIDERS, authClient, signIn } from "@/lib/auth/client";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isPending) {
    return (
      <Shell>
        <main className="mx-auto max-w-md px-4 py-20">
          <div className="h-64 animate-pulse rounded-card bg-panel" />
        </main>
      </Shell>
    );
  }
  if (user) return <RedirectToSignIn to="/" />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "up") {
        const { error: signUpError } = await authClient.signUp.email({
          name: name.trim() || email.split("@")[0] || "Студент",
          email: email.trim(),
          password,
          callbackURL: "/",
        });
        if (signUpError) throw new Error(signUpError.message || "Тіркелу сәтсіз");
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email: email.trim(),
          password,
          callbackURL: "/",
        });
        if (signInError) throw new Error(signInError.message || "Кіру сәтсіз");
      }
      await navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Қате");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <main className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-16">
        <div>
          <p className="font-mono text-xs tracking-[0.24em] text-signal">ACCESS</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            {mode === "in" ? "Кабинетке кіру" : "Жаңа аккаунт"}
          </h1>
          <p className="mt-4 max-w-md text-muted">
            Пошта мен құпия сөз осы сайттың өз базасында сақталады. Google немесе X арқылы да кіруге болады.
          </p>
        </div>

        <div className="glass rounded-card border border-line p-6 sm:p-8">
          <div className="mb-6 grid grid-cols-2 rounded-full bg-ink p-1">
            <button
              type="button"
              onClick={() => setMode("in")}
              className={
                mode === "in"
                  ? "h-10 rounded-full bg-signal font-semibold text-signal-ink"
                  : "h-10 rounded-full text-muted"
              }
            >
              Кіру
            </button>
            <button
              type="button"
              onClick={() => setMode("up")}
              className={
                mode === "up"
                  ? "h-10 rounded-full bg-signal font-semibold text-signal-ink"
                  : "h-10 rounded-full text-muted"
              }
            >
              Тіркелу
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "up" ? (
              <label className="block text-sm">
                <span className="text-muted">Аты-жөні</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-4 text-fg outline-none focus:border-signal"
                  autoComplete="name"
                />
              </label>
            ) : null}
            <label className="block text-sm">
              <span className="text-muted">Электрондық пошта</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-4 text-fg outline-none focus:border-signal"
                autoComplete="email"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Құпия сөз</span>
              <input
                required
                minLength={8}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-4 text-fg outline-none focus:border-signal"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
              />
            </label>
            {error ? <p className="text-sm text-gold">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="btn-3d w-full disabled:opacity-60"
            >
              {busy ? "Күтіңіз…" : mode === "in" ? "Кіру" : "Тіркелу"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted">
            <span className="h-px flex-1 bg-line" />
            немесе
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="space-y-2">
            {GROK_PROVIDERS.map((provider) => (
              <button
                key={provider.providerId}
                type="button"
                onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
                className="h-12 w-full rounded-full border border-line font-medium text-fg hover:border-signal"
              >
                {provider.label} арқылы жалғастыру
              </button>
            ))}
          </div>
        </div>
      </main>
    </Shell>
  );
}
