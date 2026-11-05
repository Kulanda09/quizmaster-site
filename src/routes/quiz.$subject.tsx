import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/shell";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getSubject } from "@/lib/quiz/catalog";
import { saveAttempt } from "@/lib/quiz/attempts";

export const Route = createFileRoute("/quiz/$subject")({ component: QuizPage });

function QuizPage() {
  const { subject: subjectId } = Route.useParams();
  const subject = getSubject(subjectId);
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!subject) {
    return (
      <Shell>
        <main className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold">Пән табылмады</h1>
          <Link to="/" className="mt-6 inline-flex h-11 items-center text-signal">
            Басты бетке
          </Link>
        </main>
      </Shell>
    );
  }

  const question = subject.questions[index];
  const total = subject.questions.length;
  const picked = answers[index] ?? null;
  const progress = done ? 100 : Math.round((index / total) * 100);

  function choose(optionIndex: number) {
    setAnswers((list) => {
      const next = [...list];
      next[index] = optionIndex;
      return next;
    });
  }

  function back() {
    if (index === 0) return;
    setIndex((value) => value - 1);
  }

  async function finish(finalScore: number) {
    setDone(true);
    if (!user || isPending) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveAttempt({ data: { subject: subject!.id, score: finalScore, total } });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Сақталмады");
    } finally {
      setSaving(false);
    }
  }

  function confirm() {
    if (picked === null || !question) return;
    if (index + 1 >= total) {
      const finalScore = subject!.questions.reduce(
        (sum, item, itemIndex) => sum + (answers[itemIndex] === item.correct ? 1 : 0),
        0,
      );
      setScore(finalScore);
      void finish(finalScore);
      return;
    }
    setIndex((value) => value + 1);
  }

  return (
    <Shell>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-[0.22em] text-signal">{subject.code}</p>
            <h1 className="text-2xl font-semibold">{subject.title}</h1>
          </div>
          <span className="font-mono text-sm text-muted">
            {done ? total : index + 1}/{total}
          </span>
        </div>
        <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-panel-2">
          <div className="h-full bg-signal transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>

        {done ? (
          <section className="rounded-card border border-line bg-panel p-8">
            <p className="font-mono text-xs tracking-[0.2em] text-gold">НӘТИЖЕ</p>
            <p className="mt-3 text-5xl font-semibold tracking-tight">
              {score}
              <span className="text-2xl text-muted">/{total}</span>
            </p>
            <p className="mt-3 text-muted">
              {saving
                ? "Нәтиже кабинетке жазылуда…"
                : saveError
                  ? saveError
                  : user
                    ? "Нәтиже жеке кабинетке сақталды."
                    : "Нәтиже осы бетте. Кабинетке жазу үшін кіріңіз — квизді аккаунтсыз өтуге болады."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setIndex(0);
                setAnswers([]);
                setScore(0);
                setDone(false);
              }}
              className="btn-3d"
            >
              Қайта өту
            </button>
              {user ? (
                <button
                  type="button"
                  onClick={() => navigate({ to: "/cabinet" })}
                  className="h-11 rounded-full border border-line px-5 font-semibold"
                >
                  Кабинет
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex h-11 items-center rounded-full border border-line px-5 font-semibold"
                >
                  Кіру
                </Link>
              )}
            </div>
          </section>
        ) : (
          <section className="rounded-card border border-line bg-panel p-6 sm:p-8">
            <h2 className="text-xl font-semibold leading-snug sm:text-2xl">{question.prompt}</h2>
            <div className="mt-6 grid gap-3">
              {question.options.map((option, optionIndex) => {
                const active = picked === optionIndex;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => choose(optionIndex)}
                    className={
                      active
                        ? "min-h-12 rounded-2xl border border-signal bg-signal/10 px-4 py-3 text-left font-medium text-fg"
                        : "min-h-12 rounded-2xl border border-line bg-ink px-4 py-3 text-left font-medium text-fg hover:border-signal/60"
                    }
                  >
                    <span className="mr-3 font-mono text-xs text-signal">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    {option}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" disabled={index === 0} onClick={back} className="btn-3d w-full sm:flex-1">
                Артқа
              </button>
              <button type="button" disabled={picked === null} onClick={confirm} className="btn-3d w-full sm:flex-1">
                {index + 1 === total ? "Аяқтау" : "Келесі"}
              </button>
            </div>
          </section>
        )}
      </main>
    </Shell>
  );
}
