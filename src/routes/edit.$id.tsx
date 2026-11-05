import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShareQuiz } from "@/components/share-quiz";
import { QuizForm } from "@/components/quiz-form";
import { Shell } from "@/components/shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { deleteCustomQuiz, getOwnQuiz, updateCustomQuiz, type OwnQuiz, type QuizDraft } from "@/lib/quiz/custom";

export const Route = createFileRoute("/edit/$id")({ component: EditPage });

function EditPage() {
  const { id } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<OwnQuiz | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const numeric = Number(id);
    if (!Number.isInteger(numeric)) {
      setQuiz(null);
      return;
    }
    let cancelled = false;
    getOwnQuiz({ data: numeric })
      .then((row) => {
        if (!cancelled) setQuiz(row);
      })
      .catch(() => {
        if (!cancelled) setQuiz(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  if (isPending || (user && quiz === undefined)) {
    return (
      <Shell>
        <main className="mx-auto max-w-2xl px-4 py-16">
          <div className="h-80 animate-pulse rounded-card bg-panel" />
        </main>
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn />;
  if (!quiz) {
    return (
      <Shell>
        <main className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold">Квиз табылмады</h1>
          <Link to="/cabinet" className="mt-6 inline-flex h-11 items-center text-signal">
            Кабинетке
          </Link>
        </main>
      </Shell>
    );
  }

  const current = quiz;

  async function save(draft: QuizDraft) {
    await updateCustomQuiz({ data: { id: current.id, ...draft } });
    setQuiz({ ...current, ...draft });
  }

  async function remove() {
    if (!window.confirm("Квизді өшіру керек пе?")) return;
    setError(null);
    try {
      await deleteCustomQuiz({ data: current.id });
      await navigate({ to: "/cabinet" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Өшпеді");
    }
  }

  return (
    <Shell>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold tracking-[0.16em] text-signal">БӨЛІСУ</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{quiz.title}</h1>
        <div className="mt-6">
          <ShareQuiz title={quiz.title} slug={quiz.slug} code={quiz.join_code} />
        </div>
        <Link
          to="/results/$id"
          params={{ id: String(quiz.id) }}
          className="mt-4 inline-flex h-11 items-center font-semibold text-signal"
        >
          Нәтижелер · {quiz.participants}
        </Link>
        <div className="mt-8">
          <QuizForm
            key={`${quiz.id}-${quiz.questions.length}`}
            initial={quiz}
            submitLabel="Өзгерісті сақтау"
            onSubmit={save}
          />
        </div>
        {error ? <p className="mt-4 text-sm text-gold">{error}</p> : null}
        <button type="button" onClick={() => void remove()} className="mt-4 h-11 font-semibold text-gold">
          Квизді өшіру
        </button>
      </main>
    </Shell>
  );
}
