import { useState } from "react";
import { QUIZ_SIZES, QUIZ_SUBJECTS, type CustomQuestion, type QuizDraft, type QuizVisibility } from "@/lib/quiz/custom";

const LETTERS = ["A", "B", "C", "D"] as const;

export function blankQuestion(): CustomQuestion {
  return { prompt: "", options: ["", "", "", ""], correct: 0 };
}

export function emptyDraft(size: 10 | 20 | 30 = 10): QuizDraft {
  return {
    title: "",
    description: "",
    subject: QUIZ_SUBJECTS[0],
    visibility: "public",
    questions: Array.from({ length: size }, blankQuestion),
  };
}

export function QuizForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: QuizDraft;
  submitLabel: string;
  onSubmit: (draft: QuizDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState(initial);
  const [cursor, setCursor] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const question = draft.questions[cursor];

  function patchQuestion(next: CustomQuestion) {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((item, index) => (index === cursor ? next : item)),
    }));
  }

  function setSize(size: 10 | 20 | 30) {
    setDraft((current) => {
      const questions = current.questions.slice(0, size);
      while (questions.length < size) questions.push(blankQuestion());
      return { ...current, questions };
    });
    setCursor(0);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Сақталмады");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block text-sm">
        <span className="text-muted">Квиз атауы</span>
        <input
          required
          value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-4 outline-none focus:border-signal"
        />
      </label>
      <label className="block text-sm">
        <span className="text-muted">Сипаттама</span>
        <textarea
          value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
          rows={3}
          className="mt-1 w-full rounded-xl border border-line bg-ink px-4 py-3 outline-none focus:border-signal"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted">Пән</span>
          <select
            value={draft.subject}
            onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
            className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-3 outline-none focus:border-signal"
          >
            {QUIZ_SUBJECTS.map((subject) => (
              <option key={subject}>{subject}</option>
            ))}
          </select>
        </label>
        <fieldset className="text-sm">
          <legend className="text-muted">Жариялау</legend>
          <div className="mt-2 flex gap-2">
            {(
              [
                ["public", "Барлығына ашық"],
                ["private", "Жеке"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDraft({ ...draft, visibility: value as QuizVisibility })}
                className={
                  draft.visibility === value
                    ? "h-12 flex-1 rounded-xl bg-signal font-semibold text-signal-ink"
                    : "h-12 flex-1 rounded-xl border border-line font-semibold"
                }
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <div>
        <p className="text-sm text-muted">Сұрақ саны</p>
        <div className="mt-2 flex gap-2">
          {QUIZ_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setSize(size)}
              className={
                draft.questions.length === size
                  ? "h-11 flex-1 rounded-xl bg-signal font-semibold text-signal-ink"
                  : "h-11 flex-1 rounded-xl border border-line font-semibold"
              }
            >
              {size}
            </button>
          ))}
        </div>
      </div>
      {question ? (
        <fieldset className="rounded-card border border-line bg-panel p-5">
          <legend className="px-2 font-mono text-xs text-signal">
            Сұрақ {cursor + 1} / {draft.questions.length}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {draft.questions.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCursor(index)}
                className={
                  index === cursor
                    ? "h-10 min-w-10 rounded-lg bg-signal px-2 font-mono text-sm text-signal-ink"
                    : "h-10 min-w-10 rounded-lg border border-line px-2 font-mono text-sm"
                }
              >
                {index + 1}
              </button>
            ))}
          </div>
          <input
            required
            value={question.prompt}
            onChange={(event) => patchQuestion({ ...question, prompt: event.target.value })}
            placeholder="Сұрақ мәтіні"
            className="mt-4 h-12 w-full rounded-xl border border-line bg-ink px-4 outline-none focus:border-signal"
          />
          <div className="mt-3 grid gap-2">
            {question.options.map((option, optionIndex) => (
              <label key={optionIndex} className="flex items-center gap-3">
                <input
                  type="radio"
                  name={`correct-${cursor}`}
                  checked={question.correct === optionIndex}
                  onChange={() => patchQuestion({ ...question, correct: optionIndex as 0 | 1 | 2 | 3 })}
                  className="size-4 accent-signal"
                />
                <span className="w-5 font-mono text-xs text-signal">{LETTERS[optionIndex]}</span>
                <input
                  required
                  value={option}
                  onChange={(event) => {
                    const options = [...question.options] as CustomQuestion["options"];
                    options[optionIndex] = event.target.value;
                    patchQuestion({ ...question, options });
                  }}
                  placeholder={`Нұсқа ${LETTERS[optionIndex]}`}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-ink px-3 outline-none focus:border-signal"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={cursor === 0}
              onClick={() => setCursor((value) => value - 1)}
              className="h-11 flex-1 rounded-xl border border-line font-semibold disabled:opacity-40"
            >
              Алдыңғы
            </button>
            <button
              type="button"
              disabled={cursor === draft.questions.length - 1}
              onClick={() => setCursor((value) => value + 1)}
              className="h-11 flex-1 rounded-xl border border-line font-semibold disabled:opacity-40"
            >
              Келесі
            </button>
          </div>
        </fieldset>
      ) : null}
      {error ? <p className="text-sm text-gold">{error}</p> : null}
      <button type="submit" disabled={busy} className="btn-3d w-full sm:w-auto">
        {busy ? "Сақталуда…" : submitLabel}
      </button>
    </form>
  );
}
