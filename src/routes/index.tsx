import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Scene } from "@/components/scene";
import { Shell } from "@/components/shell";
import { SUBJECTS } from "@/lib/quiz/catalog";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <Shell>
      <main className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
        <div>
          <p className="text-sm font-semibold tracking-[0.18em] text-signal">QUIZMASTER</p>
          <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Біліміңді сына, деңгейіңді көтер!
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
            Өз квизіңді жаса, білім сына, достарыңмен жарыс!
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#subjects" className="btn-3d">
              Тест өту
            </a>
            <Link to="/join" className="btn-ghost">
              Кодпен кіру
            </Link>
            <a
              href="/downloads/QuizMaster-vscode.zip"
              download="QuizMaster-vscode.zip"
              target="_blank"
              rel="noopener"
              className="btn-3d relative z-30"
            >
              Кодты жүктеу
            </a>
          </div>
          <p className="mt-4 max-w-md text-sm text-muted">
            Пән тесттері аккаунтсыз ашық. Онлайн қарсылас әлі жоқ — жеке таймер баттлы жұмыс істейді.
          </p>
        </div>
        <Scene />
      </main>

      <section id="subjects" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Бағыттар</h2>
          <span className="font-mono text-xs text-muted">Аккаунтсыз өтуге болады</span>
        </div>
        <div className="tilt-grid grid gap-4 sm:grid-cols-2">
          {SUBJECTS.map((subject) => (
            <Link
              key={subject.id}
              to="/quiz/$subject"
              params={{ subject: subject.id }}
              className="card-3d group rounded-card border border-line p-6"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs tracking-[0.2em] text-signal">{subject.code}</span>
                <ArrowUpRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-signal" />
              </div>
              <h3 className="mt-6 text-2xl font-semibold">{subject.title}</h3>
              <p className="mt-2 text-muted">{subject.blurb}</p>
            </Link>
          ))}
        </div>
      </section>
    </Shell>
  );
}
