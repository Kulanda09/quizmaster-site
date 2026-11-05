import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { getSubject, type SubjectId } from "@/lib/quiz/catalog";

export type AttemptRow = {
  id: number;
  subject: string;
  score: number;
  total: number;
  created_at: string;
};

const SUBJECT_IDS = new Set<SubjectId>(["math", "informatics", "history", "english", "it"]);

export const listAttempts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<AttemptRow[]> => {
    const sql = await getSql();
    return sql<AttemptRow>`
      select id, subject, score, total, created_at::text as created_at
      from attempts
      where user_id = ${context.userId}
      order by created_at desc
      limit 30
    `;
  });

export const saveAttempt = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { subject: string; score: number; total: number }) => {
    const subject = getSubject(data.subject);
    if (!subject || !SUBJECT_IDS.has(subject.id)) throw new Error("Белгісіз пән");
    if (!Number.isInteger(data.score) || !Number.isInteger(data.total)) {
      throw new Error("Нәтиже бүтін сан болуы керек");
    }
    if (data.total !== subject.questions.length || data.score < 0 || data.score > data.total) {
      throw new Error("Нәтиже жарамсыз");
    }
    return { subject: subject.id, score: data.score, total: data.total };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: number }>`
      insert into attempts (user_id, subject, score, total)
      values (${context.userId}, ${data.subject}, ${data.score}, ${data.total})
      returning id
    `;
    return { id: rows[0]?.id ?? 0 };
  });

export type WeeklyRank = { place: number; players: number; weeklyXp: number };

export const getWeeklyRank = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<WeeklyRank> => {
    const sql = await getSql();
    const rows = await sql<{ user_id: string; xp: number }>`
      select user_id, coalesce(sum(score), 0)::int as xp
      from attempts
      where created_at >= now() - interval '7 days'
      group by user_id
      order by xp desc, user_id asc
    `;
    const index = rows.findIndex((row) => row.user_id === context.userId);
    return {
      place: index === -1 ? 0 : index + 1,
      players: rows.length,
      weeklyXp: index === -1 ? 0 : Number(rows[index]?.xp ?? 0),
    };
  });
