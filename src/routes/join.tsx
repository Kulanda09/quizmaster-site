import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/join")({ component: JoinPage });

function JoinPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function open(event: React.FormEvent) {
    event.preventDefault();
    const value = code.trim();
    if (!/^[a-zA-Z0-9_-]{4,40}$/.test(value)) {
      setError("Кодты толық жазыңыз");
      return;
    }
    void navigate({ to: "/play/$id", params: { id: value.toUpperCase() } });
  }

  return (
    <Shell>
      <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold tracking-[0.16em] text-signal">КОД</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Квизге кіру</h1>
        <p className="mt-3 text-muted">Автор жіберген кодты жаз. Аккаунт керек емес.</p>
        <form onSubmit={open} className="mt-8 rounded-card border border-line bg-panel p-6">
          <label className="block text-sm">
            <span className="text-muted">Код</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="ABC234"
              autoCapitalize="characters"
              className="mt-2 h-14 w-full rounded-xl border border-line bg-ink px-4 font-mono text-2xl tracking-[0.2em] outline-none focus:border-signal"
            />
          </label>
          {error ? <p className="mt-3 text-sm text-gold">{error}</p> : null}
          <button type="submit" className="btn-3d mt-5 w-full">
            Квизді ашу
          </button>
        </form>
      </main>
    </Shell>
  );
}
