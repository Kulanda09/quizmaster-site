import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listQuizResults, type AttemptView } from "@/lib/quiz/custom";

export const Route = createFileRoute("/results/$id")({ component: ResultsPage });

function ResultsPage() {
  const { id } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [title, setTitle] = useState<string | null>(null);
  const [rows, setRows] = useState<AttemptView[] | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const numeric = Number(id);
    if (!Number.isInteger(numeric)) {
      setMissing(true);
      return;
    }
    let cancelled = false;
    listQuizResults({ data: numeric })
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setMissing(true);
          return;
        }
        setTitle(data.title);
        setRows(data.attempts);
      })
      .catch(() => {
        if (!cancelled) setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  if (isPending || (user && !missing && rows === null)) {
    return (
      <Shell>
        <main className="mx-auto max-w-3xl px-4 py-16">
          <div className="h-48 animate-pulse rounded-card bg-panel" />
        </main>
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn />;
  if (missing || !rows) {
    return (
      <Shell>
        <main className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold">Нәтиже табылмады</h1>
          <Link to="/cabinet" className="mt-6 inline-flex h-11 items-center text-signal">
            Кабинетке
          </Link>
        </main>
      </Shell>
    );
  }

  const average =
    rows.length === 0 ? 0 : Math.round(rows.reduce((sum, row) => sum + (row.score / row.total) * 100, 0) / rows.length);

  return (
    <Shell>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-signal">RESULTS</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-card border border-line bg-panel p-4">
            <p className="text-sm text-muted">Қатысушы</p>
            <p className="mt-1 font-mono text-3xl text-signal">{rows.length}</p>
          </div>
          <div className="rounded-card border border-line bg-panel p-4">
            <p className="text-sm text-muted">Орташа</p>
            <p className="mt-1 font-mono text-3xl text-gold">{average}%</p>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="mt-8 text-muted">Әлі ешкім тапсырмаған.</p>
        ) : (
          <ul className="mt-8 divide-y divide-line overflow-hidden rounded-card border border-line bg-panel">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="font-semibold">{row.player_name}</p>
                  <p className="font-mono text-xs text-muted">{new Date(row.created_at).toLocaleString("kk-KZ")}</p>
                </div>
                <p className="font-mono text-lg text-signal">
                  {row.score}/{row.total}
                </p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </Shell>
  );
}
