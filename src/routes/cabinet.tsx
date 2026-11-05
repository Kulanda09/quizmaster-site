import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShareQuiz } from "@/components/share-quiz";
import { Shell } from "@/components/shell";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getWeeklyRank, listAttempts, type AttemptRow, type WeeklyRank } from "@/lib/quiz/attempts";
import { deleteCustomQuiz, listMyQuizzes, type OwnQuiz } from "@/lib/quiz/custom";
import { SUBJECTS } from "@/lib/quiz/catalog";

export const Route = createFileRoute("/cabinet")({ component: CabinetPage });

const TITLES = Object.fromEntries(SUBJECTS.map((s) => [s.id, s.title]));

function CabinetPage() {
  const { user, isPending } = useCurrentUserState();
  const [rows, setRows] = useState<AttemptRow[] | null>(null);
  const [mine, setMine] = useState<OwnQuiz[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rank, setRank] = useState<WeeklyRank | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listAttempts()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Жүктелмеді");
      });
    listMyQuizzes()
      .then((data) => {
        if (!cancelled) setMine(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Жүктелмеді");
      });
    getWeeklyRank()
      .then((data) => {
        if (!cancelled) setRank(data);
      })
      .catch(() => {
        if (!cancelled) setRank({ place: 0, players: 0, weeklyXp: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (isPending || (user && (rows === null || mine === null) && !error)) {
    return (
      <Shell>
        <main className="mx-auto max-w-3xl px-4 py-12">
          <div className="h-40 animate-pulse rounded-card bg-panel" />
        </main>
      </Shell>
    );
  }
  if (!user) return <RedirectToSignIn />;

  const name = user.displayName ?? user.primaryEmail ?? "Студент";
  const initials = name
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const list = rows ?? [];
  const xp = list.reduce((sum, row) => sum + row.score * 10, 0);
  const level = Math.floor(xp / 100) + 1;
  const intoLevel = xp % 100;
  const average = list.length
    ? Math.round(list.reduce((sum, row) => sum + (row.score / row.total) * 100, 0) / list.length)
    : 0;
  const today = new Date().toDateString();
  const didToday = list.some((row) => new Date(row.created_at).toDateString() === today);
  const badges = [
    { title: "Алғашқы қадам", on: list.length >= 1 },
    { title: "Бес тест", on: list.length >= 5 },
    { title: "80%+", on: list.some((row) => row.score / row.total >= 0.8) },
    { title: "Мінсіз", on: list.some((row) => row.total > 0 && row.score === row.total) },
  ];

  return (
    <Shell>
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <p className="text-sm font-semibold tracking-[0.16em] text-signal">КАБИНЕТ</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Қош келдіңіз, {name}</h1>
        <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="card-3d rounded-card border border-line p-6">
            <div className="flex items-center gap-4">
              <div className="medal !h-16 !w-16 text-xl">{initials || "QM"}</div>
              <div>
                <p className="text-sm text-muted">Профиль</p>
                <p className="text-xl font-bold">{name}</p>
                <p className="text-sm text-muted">{user.primaryEmail}</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Stat label="XP" value={String(xp)} />
              <Stat label="Деңгей" value={String(level)} />
              <Stat label="Орташа" value={`${average}%`} />
            </div>
            <div className="mt-5">
              <div className="mb-1 flex justify-between text-xs text-muted">
                <span>Келесі деңгей</span>
                <span>{intoLevel}/100</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-panel-2">
                <div className="h-full rounded-full bg-signal" style={{ width: `${intoLevel}%` }} />
              </div>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-card border border-line bg-panel p-5">
              <p className="text-sm text-muted">Күнделікті тапсырма</p>
              <p className="mt-2 text-lg font-bold">{didToday ? "Бүгінгі тест орындалды" : "Бүгін бір тест тапсыр"}</p>
              {!didToday ? (
                <Link to="/" className="mt-3 inline-flex h-11 items-center font-semibold text-signal">
                  Бастау
                </Link>
              ) : null}
            </div>
            <div className="rounded-card border border-line bg-panel p-5">
              <p className="text-sm text-muted">Апталық рейтинг</p>
              <p className="mt-2 text-lg font-bold">
                {rank && rank.place > 0 ? `${rank.place}-орын · ${rank.players} ойыншы` : "Осы аптада әлі нәтиже жоқ"}
              </p>
              <p className="mt-1 text-sm text-muted">Апталық XP: {rank?.weeklyXp ?? 0}. Басқа адамның аты көрсетілмейді.</p>
            </div>
          </div>
        </section>
        <section className="mt-6">
          <h2 className="text-lg font-bold">Жеке статистика</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Тест" value={String(list.length)} />
            <Stat label="XP" value={String(xp)} />
            <Stat label="Орташа" value={`${average}%`} />
            <Stat
              label="Ең жоғары"
              value={
                list.length
                  ? `${Math.max(...list.map((row) => Math.round((row.score / row.total) * 100)))}%`
                  : "0%"
              }
            />
          </div>
        </section>
        <section className="mt-6">
          <h2 className="text-lg font-bold">Жетістіктер</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {badges.map((badge) => (
              <li
                key={badge.title}
                className={
                  badge.on
                    ? "rounded-2xl border border-line bg-panel px-3 py-4 text-sm font-semibold"
                    : "rounded-2xl border border-dashed border-line px-3 py-4 text-sm text-muted"
                }
              >
                {badge.on ? "★ " : ""}
                {badge.title}
              </li>
            ))}
          </ul>
        </section>
        <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Менің квиздерім</h2>
            <p className="mt-1 text-sm text-muted">Тек өз квизіңді өңдей аласың.</p>
          </div>
          <Link to="/create" className="btn-3d">
            AI квиз
          </Link>
        </div>
        {mine && mine.length === 0 ? (
          <p className="mt-6 text-muted">Әлі өз квизің жоқ.</p>
        ) : (
          <ul className="mt-6 grid gap-3">
            {mine?.map((quiz) => (
                <li key={quiz.id} className="rounded-card border border-line bg-panel p-5">
                  <div>
                    <p className="font-mono text-xs tracking-[0.16em] text-signal">{quiz.subject}</p>
                    <h3 className="mt-1 text-xl font-semibold">{quiz.title}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {quiz.visibility === "public" ? "Барлығына ашық" : "Жеке"} · {quiz.questions.length} сұрақ ·{" "}
                      {quiz.participants} қатысушы
                    </p>
                  </div>
                  <div className="mt-4">
                    <ShareQuiz title={quiz.title} slug={quiz.slug} code={quiz.join_code} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to="/edit/$id"
                      params={{ id: String(quiz.id) }}
                      className="inline-flex h-11 items-center rounded-xl border border-line px-4 font-semibold"
                    >
                      Өңдеу
                    </Link>
                    <Link
                      to="/results/$id"
                      params={{ id: String(quiz.id) }}
                      className="inline-flex h-11 items-center rounded-xl border border-line px-4 font-semibold"
                    >
                      Нәтиже
                    </Link>
                    <button
                      type="button"
                      className="h-11 rounded-xl px-4 font-semibold text-gold"
                      onClick={() => {
                        if (!window.confirm("Квизді өшіру керек пе?")) return;
                        void deleteCustomQuiz({ data: quiz.id }).then(() => {
                          setMine((list) => list?.filter((item) => item.id !== quiz.id) ?? []);
                        });
                      }}
                    >
                      Өшіру
                    </button>
                  </div>
                </li>
            ))}
          </ul>
        )}

        <h2 className="mt-12 text-2xl font-semibold tracking-tight">Соңғы тесттер</h2>

        {error ? <p className="mt-6 text-gold">{error}</p> : null}

        {!error && rows && rows.length === 0 ? (
          <div className="mt-8 rounded-card border border-dashed border-line p-8">
            <p className="text-muted">Әлі нәтиже жоқ. Бір пәннен бастаңыз.</p>
            <Link to="/" className="mt-4 inline-flex h-11 items-center font-semibold text-signal">
              Пәндерге өту
            </Link>
          </div>
        ) : null}

        <ul className="mt-8 divide-y divide-line overflow-hidden rounded-card border border-line bg-panel">
          {rows?.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="font-semibold">{TITLES[row.subject] ?? row.subject}</p>
                <p className="font-mono text-xs text-muted">{new Date(row.created_at).toLocaleString("kk-KZ")}</p>
              </div>
              <p className="font-mono text-lg text-signal">
                {row.score}/{row.total}
              </p>
            </li>
          ))}
        </ul>
      </main>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-ink px-3 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-signal">{value}</p>
    </div>
  );
}
