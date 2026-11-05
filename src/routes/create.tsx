import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { emptyDraft, QuizForm } from "@/components/quiz-form";
import { Shell } from "@/components/shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { generateAiQuiz } from "@/lib/quiz/ai";
import { createCustomQuiz, QUIZ_SIZES, QUIZ_SUBJECTS, type QuizDraft } from "@/lib/quiz/custom";
import { getProStatus, type ProStatus } from "@/lib/quiz/pro";

export const Route = createFileRoute("/create")({ component: CreatePage });

function CreatePage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ProStatus | null>(null);
  const [draft, setDraft] = useState<QuizDraft>(() => emptyDraft(10));
  const [formKey, setFormKey] = useState(0);
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState<string>(QUIZ_SUBJECTS[0]);
  const [size, setSize] = useState<(typeof QUIZ_SIZES)[number]>(10);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getProStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus({ active: false, priceKzt: 2500, endsAt: null });
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (isPending || (user && !status)) {
    return (
      <Shell>
        <main className="mx-auto max-w-2xl px-4 py-16">
          <div className="h-80 animate-pulse rounded-card bg-panel" />
        </main>
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn />;

  async function save(next: QuizDraft) {
    const created = await createCustomQuiz({ data: next });
    await navigate({ to: "/edit/$id", params: { id: String(created.id) } });
  }

  async function generate() {
    setAiBusy(true);
    setAiError(null);
    try {
      const next = await generateAiQuiz({ data: { topic, subject, size } });
      setDraft(next);
      setFormKey((value) => value + 1);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "ЖИ жауап бермеді");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <Shell>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold tracking-[0.16em] text-signal">AI</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Жасанды интеллектпен квиз</h1>
        <p className="mt-2 text-muted">Тақырып жаз. AI сұрақтарды қазақша толтырады, содан кейін өзің түзетесің.</p>
        <section className="mt-8 rounded-card border border-line bg-panel p-5">
          <h2 className="text-lg font-bold">AI квиз жасау</h2>
          <label className="mt-4 block text-sm">
            <span className="text-muted">Тақырып</span>
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Мысалы: пайыз, HTTP кодтары"
              className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-4 outline-none focus:border-signal"
            />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-muted">Пән</span>
              <select
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-3"
              >
                {QUIZ_SUBJECTS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <div>
              <p className="text-sm text-muted">Сұрақ</p>
              <div className="mt-1 flex gap-2">
                {QUIZ_SIZES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSize(item)}
                    className={
                      size === item
                        ? "h-12 flex-1 rounded-xl bg-white font-semibold text-signal-ink"
                        : "h-12 flex-1 rounded-xl border border-line font-semibold"
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {aiError ? <p className="mt-3 text-sm text-gold">{aiError}</p> : null}
          {status?.active ? (
            <button type="button" disabled={aiBusy || topic.trim().length < 3} onClick={() => void generate()} className="btn-3d mt-4">
              {aiBusy ? "AI жазып жатыр…" : "AI квиз жасасын"}
            </button>
          ) : (
            <Link to="/pro" className="btn-3d mt-4">
              AI ашу — Pro 2500 ₸
            </Link>
          )}
        </section>
        {status?.active ? (
          <div className="mt-8">
            <QuizForm key={formKey} initial={draft} submitLabel="Квизді сақтау" onSubmit={save} />
          </div>
        ) : null}
      </main>
    </Shell>
  );
}
