import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { getPlayQuiz, revealCustomAnswer, submitCustomAttempt, type PlayQuestion } from "@/lib/quiz/custom";

export const Route = createFileRoute("/play/$id")({ component: PlayPage });

function PlayPage() {
  const { id } = Route.useParams();
  const user = useCurrentUser();
  const [quiz, setQuiz] = useState<{ title: string; description: string; subject: string; questions: PlayQuestion[] } | null | undefined>(undefined);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [name, setName] = useState("");
  const [done, setDone] = useState<{ score: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<Record<number, number>>({});
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPlayQuiz({ data: id })
      .then((row) => {
        if (!cancelled) setQuiz(row);
      })
      .catch(() => {
        if (!cancelled) setQuiz(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (user && !name) setName(user.displayName ?? user.primaryEmail ?? "");
  }, [user, name]);

  if (quiz === undefined) {
    return (
      <Shell>
        <main className="mx-auto max-w-2xl px-4 py-16">
          <div className="h-72 animate-pulse rounded-card bg-panel" />
        </main>
      </Shell>
    );
  }
  if (!quiz) {
    return (
      <Shell>
        <main className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold">Квиз табылмады</h1>
          <Link to="/" className="mt-6 inline-flex h-11 items-center text-signal">
            Басты бетке
          </Link>
        </main>
      </Shell>
    );
  }

  const question = quiz.questions[index];
  const total = quiz.questions.length;
  const picked = answers[index] ?? null;
  const correctIndex = shown[index] ?? null;

  async function choose(optionIndex: number) {
    if (answers[index] != null || checking) return;
    setAnswers((list) => {
      const next = [...list];
      next[index] = optionIndex;
      return next;
    });
    setChecking(true);
    setError(null);
    try {
      const result = await revealCustomAnswer({ data: { slug: id, index, picked: optionIndex } });
      setShown((map) => ({ ...map, [index]: result.correctIndex }));
    } catch (err) {
      setAnswers((list) => {
        const next = [...list];
        next[index] = null;
        return next;
      });
      setError(err instanceof Error ? err.message : "Жауап ашылмады");
    } finally {
      setChecking(false);
    }
  }

  function back() {
    if (index === 0) return;
    setIndex((value) => value - 1);
  }

  async function finish(finalAnswers: number[]) {
    setBusy(true);
    setError(null);
    try {
      const result = await submitCustomAttempt({
        data: { slug: id, playerName: name, answers: finalAnswers },
      });
      setDone({ score: result.score, total: result.total });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Жіберілмеді");
    } finally {
      setBusy(false);
    }
  }

  function confirm() {
    if (picked === null || !question) return;
    if (index + 1 >= total) {
      if (answers.some((answer) => answer === null || answer === undefined)) return;
      void finish(answers as number[]);
      return;
    }
    setIndex((value) => value + 1);
  }

  return (
    <Shell>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="font-mono text-xs tracking-[0.22em] text-gold">{quiz.subject}</p>
        <h1 className="mt-2 text-2xl font-semibold">{quiz.title}</h1>
        {quiz.description ? <p className="mt-2 text-muted">{quiz.description}</p> : null}
        {done ? (
          <section className="mt-8 rounded-card border border-line bg-panel p-8">
            <p className="font-mono text-xs tracking-[0.2em] text-gold">НӘТИЖЕ</p>
            <p className="mt-3 text-5xl font-semibold">
              {done.score}
              <span className="text-2xl text-muted">/{done.total}</span>
            </p>
            <button
              type="button"
              className="btn-3d mt-8"
              onClick={() => {
                setIndex(0);
                setAnswers([]);
                setShown({});
                setDone(null);
              }}
            >
              Қайта өту
            </button>
          </section>
        ) : (
          <section className="mt-8 rounded-card border border-line bg-panel p-6 sm:p-8">
            <label className="block text-sm">
              <span className="text-muted">Атыңыз</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Қонақ"
                className="mt-1 h-11 w-full rounded-xl border border-line bg-ink px-3 outline-none focus:border-signal"
              />
            </label>
            <p className="mt-4 font-mono text-sm text-muted">
              {index + 1}/{total}
            </p>
            <h2 className="mt-2 text-xl font-semibold">{question.prompt}</h2>
            <div className="mt-6 grid gap-3">
              {question.options.map((option, optionIndex) => {
                const revealed = correctIndex !== null;
                const isCorrect = revealed && optionIndex === correctIndex;
                const isPick = picked === optionIndex;
                const tone = !revealed
                  ? isPick
                    ? "border-signal bg-signal/10"
                    : "border-line bg-ink hover:border-signal/60"
                  : isCorrect
                    ? "border-emerald-300 bg-emerald-400/15"
                    : isPick
                      ? "border-rose-300 bg-rose-400/15"
                      : "border-line bg-ink opacity-70";
                return (
                  <button
                    key={`${index}-${optionIndex}`}
                    type="button"
                    onClick={() => void choose(optionIndex)}
                    className={`min-h-12 rounded-2xl border px-4 py-3 text-left ${tone}`}
                  >
                    <span className="mr-3 font-mono text-xs text-signal">{String.fromCharCode(65 + optionIndex)}</span>
                    {option}
                    {isCorrect ? <span className="ml-2 text-sm text-emerald-200">Дұрыс</span> : null}
                    {revealed && isPick && !isCorrect ? <span className="ml-2 text-sm text-rose-200">Қате</span> : null}
                  </button>
                );
              })}
            </div>
            {error ? <p className="mt-4 text-sm text-gold">{error}</p> : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" disabled={index === 0 || busy} onClick={back} className="btn-3d w-full sm:flex-1">
                Артқа
              </button>
              <button type="button" disabled={picked === null || busy || correctIndex === null} onClick={confirm} className="btn-3d w-full sm:flex-1">
                {busy ? "Тексерілуде…" : index + 1 === total ? "Аяқтау" : "Келесі"}
              </button>
            </div>
          </section>
        )}
      </main>
    </Shell>
  );
}
