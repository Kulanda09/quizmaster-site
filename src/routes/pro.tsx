import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getProStatus, startPro, type ProStatus } from "@/lib/quiz/pro";

export const Route = createFileRoute("/pro")({ component: ProPage });

function ProPage() {
  const { user, isPending } = useCurrentUserState();
  const [status, setStatus] = useState<ProStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getProStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Жүктелмеді");
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (isPending || (user && !status && !error)) {
    return (
      <Shell>
        <main className="mx-auto max-w-lg px-4 py-16">
          <div className="h-64 animate-pulse rounded-card bg-panel" />
        </main>
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn />;

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      setStatus(await startPro());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ашылмады");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <main className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <p className="text-sm font-semibold tracking-[0.16em] text-signal">PRO</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Айына 2500 ₸</h1>
        <p className="mt-3 text-muted">Кірген аккаунт өз тестін жасайды. ЖИ тақырып бойынша квиз құрастырады.</p>
        <ul className="mt-6 space-y-2 text-sm">
          <li>10, 20 немесе 30 сұрақтық квиз</li>
          <li>Жасанды интеллектпен толтыру</li>
          <li>Өңдеу, жариялау және сілтеме</li>
        </ul>
        <p className="mt-6 text-sm text-muted">
          Төлем шлюзі әлі қосылмаған, картадан 2500 ₸ алынбайды. Pro осы аккаунтқа 30 күнге жазылады.
        </p>
        {status?.active ? (
          <p className="mt-6 font-semibold">
            Pro белсенді{status.endsAt ? ` · ${new Date(status.endsAt).toLocaleDateString("kk-KZ")} дейін` : ""}.
          </p>
        ) : (
          <button type="button" disabled={busy} onClick={() => void activate()} className="btn-3d mt-6">
            {busy ? "Ашылуда…" : "Pro ашу — 2500 ₸/ай"}
          </button>
        )}
        {error ? <p className="mt-4 text-sm text-gold">{error}</p> : null}
        <Link to="/create" className="mt-6 inline-flex h-11 items-center font-semibold text-signal">
          Квиз жасауға өту
        </Link>
      </main>
    </Shell>
  );
}
