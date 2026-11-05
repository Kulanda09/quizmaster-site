import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { SUBJECTS } from "@/lib/quiz/catalog";
import { requirePro } from "@/lib/quiz/pro";

export const QUIZ_SUBJECTS = [...SUBJECTS.map((subject) => subject.title), "Басқа"] as const;
export const QUIZ_SIZES = [10, 20, 30] as const;

export type QuizVisibility = "public" | "private";

export type CustomQuestion = {
  prompt: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
};

export type PlayQuestion = {
  prompt: string;
  options: [string, string, string, string];
};

export type QuizDraft = {
  title: string;
  description: string;
  subject: string;
  visibility: QuizVisibility;
  questions: CustomQuestion[];
};

export type OwnQuiz = QuizDraft & {
  id: number;
  slug: string;
  join_code: string;
  created_at: string;
  participants: number;
};

export type PublicQuizCard = {
  id: number;
  slug: string;
  title: string;
  description: string;
  subject: string;
  questionCount: number;
};

export type AttemptView = {
  id: number;
  player_name: string;
  score: number;
  total: number;
  created_at: string;
};

type QuestionRow = {
  id: number;
  slug: string;
  join_code: string | null;
  title: string;
  description: string;
  subject: string;
  visibility: string;
  questions: CustomQuestion[] | string;
  created_at: string;
  participants?: number | string;
};

function parseQuestions(value: CustomQuestion[] | string): CustomQuestion[] {
  return typeof value === "string" ? (JSON.parse(value) as CustomQuestion[]) : value;
}

function cleanQuiz(input: QuizDraft): QuizDraft {
  const title = input.title.trim();
  const description = input.description.trim();
  const subject = input.subject.trim();
  if (title.length < 3 || title.length > 80) throw new Error("Атауы 3–80 таңба болуы керек");
  if (description.length > 400) throw new Error("Сипаттама 400 таңбадан аспасын");
  if (!QUIZ_SUBJECTS.includes(subject as (typeof QUIZ_SUBJECTS)[number])) throw new Error("Пәнді таңдаңыз");
  if (input.visibility !== "public" && input.visibility !== "private") throw new Error("Жариялау түрін таңдаңыз");
  if (!Array.isArray(input.questions) || !QUIZ_SIZES.includes(input.questions.length as 10 | 20 | 30)) {
    throw new Error("Сұрақ саны 10, 20 немесе 30 болуы керек");
  }
  const questions = input.questions.map((question, index) => {
    const prompt = question.prompt.trim();
    if (prompt.length < 5 || prompt.length > 240) throw new Error(`Сұрақ ${index + 1}: мәтін 5–240 таңба`);
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      throw new Error(`Сұрақ ${index + 1}: 4 нұсқа керек`);
    }
    const options = question.options.map((option) => option.trim()) as CustomQuestion["options"];
    if (options.some((option) => option.length < 1 || option.length > 120)) {
      throw new Error(`Сұрақ ${index + 1}: нұсқа бос болмауы керек`);
    }
    const correct = question.correct;
    if (correct !== 0 && correct !== 1 && correct !== 2 && correct !== 3) {
      throw new Error(`Сұрақ ${index + 1}: дұрыс жауапты белгілеңіз`);
    }
    return { prompt, options, correct };
  });
  return { title, description, subject, visibility: input.visibility, questions };
}

function toOwn(row: QuestionRow): OwnQuiz {
  return {
    id: row.id,
    slug: row.slug,
    join_code: row.join_code ?? "",
    title: row.title,
    description: row.description ?? "",
    subject: row.subject,
    visibility: row.visibility === "private" ? "private" : "public",
    questions: parseQuestions(row.questions),
    created_at: row.created_at,
    participants: Number(row.participants ?? 0),
  };
}

function newSlug() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

async function ensureJoinCode(
  sql: Awaited<ReturnType<typeof getSql>>,
  row: { id: number; join_code: string | null },
) {
  if (row.join_code) return row.join_code;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = newCode();
    try {
      const updated = await sql<{ join_code: string }>`
        update custom_quizzes
        set join_code = ${code}
        where id = ${row.id} and join_code is null
        returning join_code
      `;
      if (updated[0]?.join_code) return updated[0].join_code;
    } catch {
      continue;
    }
    const again = await sql<{ join_code: string | null }>`
      select join_code from custom_quizzes where id = ${row.id}
    `;
    if (again[0]?.join_code) return again[0].join_code;
  }
  throw new Error("Код берілмеді");
}

export const listPublicQuizzes = createServerFn({ method: "GET" }).handler(async (): Promise<PublicQuizCard[]> => {
  const sql = await getSql();
  const rows = await sql<{
    id: number;
    slug: string;
    title: string;
    description: string;
    subject: string;
    question_count: number;
  }>`
    select id, slug, title, description, subject, jsonb_array_length(questions) as question_count
    from custom_quizzes
    where visibility = 'public' and slug is not null
    order by created_at desc
    limit 40
  `;
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    subject: row.subject,
    questionCount: Number(row.question_count),
  }));
});

export const getPlayQuiz = createServerFn({ method: "GET" })
  .validator((slug: string) => {
    const value = slug.trim();
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(value)) throw new Error("Квиз табылмады");
    return value;
  })
  .handler(async ({ data }): Promise<{ title: string; description: string; subject: string; questions: PlayQuestion[] } | null> => {
    const sql = await getSql();
    const rows = await sql<{ title: string; description: string; subject: string; questions: CustomQuestion[] | string }>`
      select title, description, subject, questions
      from custom_quizzes
      where lower(slug) = lower(${data}) or join_code = upper(${data})
    `;
    const row = rows[0];
    if (!row) return null;
    return {
      title: row.title,
      description: row.description,
      subject: row.subject,
      questions: parseQuestions(row.questions).map((question) => ({
        prompt: question.prompt,
        options: question.options,
      })),
    };
  });

export const submitCustomAttempt = createServerFn({ method: "POST" })
  .validator((input: { slug: string; playerName: string; answers: number[] }) => {
    const slug = input.slug.trim();
    if (!/^[a-zA-Z0-9_-]{1,40}$/.test(slug)) throw new Error("Квиз табылмады");
    const playerName = input.playerName.trim().slice(0, 40) || "Қонақ";
    if (!Array.isArray(input.answers) || input.answers.length < 1 || input.answers.length > 30) {
      throw new Error("Жауаптар толық емес");
    }
    if (input.answers.some((answer) => answer !== 0 && answer !== 1 && answer !== 2 && answer !== 3)) {
      throw new Error("Жауаптар толық емес");
    }
    return { slug, playerName, answers: input.answers };
  })
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: number; questions: CustomQuestion[] | string }>`
      select id, questions from custom_quizzes
      where lower(slug) = lower(${data.slug}) or join_code = upper(${data.slug})
    `;
    const row = rows[0];
    if (!row) throw new Error("Квиз табылмады");
    const questions = parseQuestions(row.questions);
    if (data.answers.length !== questions.length) throw new Error("Жауаптар толық емес");
    let score = 0;
    const review = questions.map((question, index) => {
      const picked = data.answers[index];
      if (picked === question.correct) score += 1;
      return { picked, correct: question.correct };
    });
    await sql`
      insert into custom_attempts (quiz_id, player_name, score, total)
      values (${row.id}, ${data.playerName}, ${score}, ${questions.length})
    `;
    return { score, total: questions.length, review };
  });

export const listMyQuizzes = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<OwnQuiz[]> => {
    const sql = await getSql();
    const rows = await sql<QuestionRow>`
      select q.id, q.slug, q.join_code, q.title, q.description, q.subject, q.visibility, q.questions,
             q.created_at::text as created_at,
             (select count(*)::int from custom_attempts a where a.quiz_id = q.id) as participants
      from custom_quizzes q
      where q.user_id = ${context.userId}
      order by q.created_at desc
    `;
    return Promise.all(
      rows.map(async (row) => {
        row.join_code = await ensureJoinCode(sql, row);
        return toOwn(row);
      }),
    );
  });

export const getOwnQuiz = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: number) => {
    if (!Number.isInteger(id) || id < 1) throw new Error("Квиз табылмады");
    return id;
  })
  .handler(async ({ context, data }): Promise<OwnQuiz | null> => {
    const sql = await getSql();
    const rows = await sql<QuestionRow>`
      select id, slug, join_code, title, description, subject, visibility, questions,
             created_at::text as created_at,
             (select count(*)::int from custom_attempts a where a.quiz_id = custom_quizzes.id) as participants
      from custom_quizzes
      where id = ${data} and user_id = ${context.userId}
    `;
    const row = rows[0];
    if (!row) return null;
    row.join_code = await ensureJoinCode(sql, row);
    return toOwn(row);
  });

export const createCustomQuiz = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(cleanQuiz)
  .handler(async ({ context, data }) => {
    await requirePro(context.userId);
    const sql = await getSql();
    const slug = newSlug();
    const joinCode = newCode();
    const rows = await sql<{ id: number; slug: string; join_code: string }>`
      insert into custom_quizzes (user_id, title, description, subject, visibility, questions, slug, join_code)
      values (
        ${context.userId},
        ${data.title},
        ${data.description},
        ${data.subject},
        ${data.visibility},
        ${JSON.stringify(data.questions)}::jsonb,
        ${slug},
        ${joinCode}
      )
      returning id, slug, join_code
    `;
    return { id: rows[0]?.id ?? 0, slug: rows[0]?.slug ?? slug, join_code: rows[0]?.join_code ?? joinCode };
  });

export const updateCustomQuiz = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: QuizDraft & { id: number }) => {
    if (!Number.isInteger(input.id) || input.id < 1) throw new Error("Квиз табылмады");
    return { id: input.id, ...cleanQuiz(input) };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: number }>`
      update custom_quizzes
      set title = ${data.title},
          description = ${data.description},
          subject = ${data.subject},
          visibility = ${data.visibility},
          questions = ${JSON.stringify(data.questions)}::jsonb
      where id = ${data.id} and user_id = ${context.userId}
      returning id
    `;
    if (!rows[0]) throw new Error("Бұл квизді өзгертуге рұқсат жоқ");
    return { id: rows[0].id };
  });

export const deleteCustomQuiz = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((id: number) => {
    if (!Number.isInteger(id) || id < 1) throw new Error("Квиз табылмады");
    return id;
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: number }>`
      delete from custom_quizzes
      where id = ${data} and user_id = ${context.userId}
      returning id
    `;
    if (!rows[0]) throw new Error("Бұл квизді өшіруге рұқсат жоқ");
    return { id: rows[0].id };
  });

export const listQuizResults = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: number) => {
    if (!Number.isInteger(id) || id < 1) throw new Error("Квиз табылмады");
    return id;
  })
  .handler(async ({ context, data }): Promise<{ title: string; attempts: AttemptView[] } | null> => {
    const sql = await getSql();
    const quizzes = await sql<{ title: string }>`
      select title from custom_quizzes where id = ${data} and user_id = ${context.userId}
    `;
    if (!quizzes[0]) return null;
    const attempts = await sql<AttemptView>`
      select id, player_name, score, total, created_at::text as created_at
      from custom_attempts
      where quiz_id = ${data}
      order by created_at desc
    `;
    return { title: quizzes[0].title, attempts };
  });
