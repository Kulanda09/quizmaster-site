import { useState } from "react";

export function ShareQuiz({ title, slug, code }: { title: string; slug: string; code: string }) {
  const [note, setNote] = useState<string | null>(null);
  const link = typeof window === "undefined" ? `/play/${slug}` : `${window.location.origin}/play/${code}`;

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setNote(label);
  }

  async function send() {
    const text = `QuizMaster квизі: «${title}». Код: ${code}`;
    if (navigator.share) {
      await navigator.share({ title, text, url: link });
      return;
    }
    await copy(`${text}\n${link}`, "Хабарлама көшірілді");
  }

  return (
    <div className="rounded-card border border-line bg-panel p-5">
      <p className="text-sm text-muted">Квиз коды</p>
      <p className="mt-1 font-mono text-3xl font-bold tracking-[0.28em] text-fg">{code}</p>
      <p className="mt-3 break-all text-sm text-muted">{link}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-3d" onClick={() => void send()}>
          Жіберу
        </button>
        <button type="button" className="btn-ghost" onClick={() => void copy(code, "Код көшірілді")}>
          Кодты көшіру
        </button>
        <button type="button" className="btn-ghost" onClick={() => void copy(link, "Сілтеме көшірілді")}>
          Сілтемені көшіру
        </button>
      </div>
      {note ? <p className="mt-3 text-sm text-signal">{note}</p> : null}
    </div>
  );
}
