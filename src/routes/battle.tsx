import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Shell } from "@/components/shell";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { saveAttempt } from "@/lib/quiz/attempts";
import { SUBJECTS, getSubject, type SubjectId } from "@/lib/quiz/catalog";

export const Route = createFileRoute("/battle")({ component: BattlePage });

const SECONDS = 12;

function BattlePage() {
  const { user } = useCurrentUserState();
  const [subjectId, setSubjectId] = useState<SubjectId | null>(null);
  const subject = subjectId ? getSubject(subjectId) : undefined;
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [flash, setFlash] = useState<"ok" | "bad" | null>(null);
  const [done, setDone] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const lock = useRef(false);

  const total = subject?.questions.length ?? 0;
  const question = subject?.questions[index];

  useEffect(() => {
    if (count === null || count <= 0) return;
    const timer = window.setTimeout(() => setCount((value) => (value === null ? null : value - 1)), 700);
    return () => window.clearTimeout(timer);
  }, [count]);

  useEffect(() => {
    if (!subject || done || flash || count !== 0) return;
    if (left <= 0) {
      settle(false);
      return;
    }
    const timer = window.setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [left, done, flash, index, subjectId, count]);

  function settle(ok: boolean) {
    if (lock.current || done || !subject) return;
    lock.current = true;
    setFlash(ok ? "ok" : "bad");
    const nextScore = score + (ok ? 1 : 0);
    window.setTimeout(() => {
      if (index + 1 >= subject.questions.length) {
        setScore(nextScore);
        setDone(true);
        setFlash(null);
        if (user) {
          saveAttempt({ data: { subject: subject.id, score: nextScore, total: subject.questions.length } })
            .then(() => setSavedNote("Нәтиже кабинетке жазылды"))
            .catch(() => setSavedNote("Нәтиже сақталмады"));
        }
        return;
      }
      setScore(nextScore);
      setIndex((value) => value + 1);
      setLeft(SECONDS);
      setFlash(null);
      lock.current = false;
    }, 650);
  }

  function reset(next: SubjectId | null) {
    setSubjectId(next);
    setIndex(0);
    setScore(0);
    setLeft(SECONDS);
    setFlash(null);
    setDone(false);
    setSavedNote(null);
    setCount(next ? 3 : null);
    lock.current = false;
  }

  const won = done && total > 0 && score / total >= 0.7;
  const initials = (user?.displayName ?? user?.primaryEmail ?? "Сіз")
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <Shell>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold tracking-[0.16em] text-gold">ЖЕКЕ БАТТЛ</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Таймермен жарыс</h1>
        <p className="mt-2 text-muted">
          Онлайн қарсылас қосылмаған. Бұл жеке режим: әр сұраққа {SECONDS} секунд, ұпай нақты есептеледі.
        </p>
        {!subject || !question ? (
          <div className="mt-8 grid gap-3">
            {SUBJECTS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => reset(item.id)}
                className="card-3d rounded-card border border-line px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-signal">{item.code}</span>
                <span className="mt-1 block text-lg font-bold">{item.title}</span>
              </button>
            ))}
          </div>
        ) : done ? (
          <section className="relative mt-8 overflow-hidden rounded-card border border-line bg-panel p-8">
            {won ? <Confetti /> : null}
            <div className="medal mx-auto">{initials || "★"}</div>
            <p className="mt-4 text-center text-sm text-muted">{won ? "Жеңдіңіз" : "Мақсаттан сәл қалдыңыз"}</p>
            <p className="mt-2 text-center text-5xl font-extrabold">
              {score}
              <span className="text-2xl text-muted">/{total}</span>
            </p>
            {savedNote ? <p className="mt-3 text-center text-sm text-muted">{savedNote}</p> : null}
            {!user ? <p className="mt-3 text-center text-sm text-muted">Кірсеңіз, нәтиже кабинетке жазылады.</p> : null}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" className="btn-3d" onClick={() => reset(subject.id)}>
                Қайта
              </button>
              <Link to="/" className="btn-ghost">
                Пәндер
              </Link>
            </div>
          </section>
        ) : count !== null && count > 0 ? (
          <section className="mt-8 rounded-card border border-line bg-panel p-10 text-center">
            <div className="medal mx-auto">{initials || "★"}</div>
            <p className="mt-4 text-sm text-muted">Дайын бол</p>
            <p className="mt-2 text-7xl font-extrabold text-signal">{count}</p>
          </section>
        ) : (
          <section className={`mt-8 rounded-card border border-line bg-panel p-6 sm:p-8 ${flash === "ok" ? "flash-ok" : ""} ${flash === "bad" ? "flash-bad" : ""}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="medal !h-12 !w-12 text-base">{initials || "★"}</div>
              <p className="font-mono text-2xl font-extrabold text-signal">{left}с</p>
              <p className="font-semibold">
                {score} ұпай
              </p>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-panel-2">
              <div className="h-full bg-signal" style={{ width: `${Math.round((index / total) * 100)}%` }} />
            </div>
            <p className="mt-4 text-sm text-muted">
              {index + 1}/{total}
              {flash === "ok" ? " · Дұрыс" : flash === "bad" ? " · Қате" : ""}
            </p>
            <h2 className="mt-2 text-xl font-bold">{question.prompt}</h2>
            <div className="mt-5 grid gap-3">
              {question.options.map((option, optionIndex) => (
                <button
                  key={`${index}-${optionIndex}`}
                  type="button"
                  disabled={flash !== null}
                  onClick={() => settle(optionIndex === question.correct)}
                  className="min-h-12 rounded-2xl border border-line bg-ink px-4 py-3 text-left font-medium hover:border-signal"
                >
                  {option}
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </Shell>
  );
}

function Confetti() {
  const bits = ["#ffffff", "#d7e4ff", "#3c7dff", "#16356e", "#9eb6ff"];
  return (
    <div className="confetti pointer-events-none absolute inset-x-0 top-0 h-40">
      {bits.concat(bits, bits).map((color, index) => (
        <i key={index} style={{ left: `${(index * 17) % 100}%`, background: color, animationDelay: `${index * 0.04}s` }} />
      ))}
    </div>
  );
}
