import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { QUIZ_SIZES, QUIZ_SUBJECTS, type CustomQuestion, type QuizDraft } from "@/lib/quiz/custom";
import { requirePro } from "@/lib/quiz/pro";

type AiInput = { topic: string; subject: string; size: 10 | 20 | 30 };

function readInput(input: AiInput): AiInput {
  const topic = input.topic.trim();
  const subject = input.subject.trim();
  if (topic.length < 3 || topic.length > 200) throw new Error("Тақырып 3–200 таңба");
  if (!QUIZ_SUBJECTS.includes(subject as (typeof QUIZ_SUBJECTS)[number])) throw new Error("Пәнді таңдаңыз");
  if (!QUIZ_SIZES.includes(input.size)) throw new Error("Сұрақ саны 10, 20 немесе 30");
  return { topic, subject, size: input.size };
}

function readDraft(raw: string, size: number, subject: string, topic: string): QuizDraft {
  const parsed = JSON.parse(raw) as {
    title?: string;
    description?: string;
    questions?: Array<{ prompt?: string; options?: string[]; correct?: number }>;
  };
  const questions = (parsed.questions ?? []).slice(0, size).map((question) => {
    const options = (question.options ?? []).map((option) => String(option).trim()).slice(0, 4);
    while (options.length < 4) options.push("—");
    const correct: CustomQuestion["correct"] = question.correct === 1 || question.correct === 2 || question.correct === 3 ? question.correct : 0;
    return {
      prompt: String(question.prompt ?? "").trim(),
      options: options as CustomQuestion["options"],
      correct,
    };
  });
  if (questions.length !== size) throw new Error("ЖИ сұрақ санын толық қайтармады");
  return {
    title: String(parsed.title ?? topic).trim().slice(0, 80),
    description: String(parsed.description ?? "").trim().slice(0, 400),
    subject,
    visibility: "private",
    questions,
  };
}

export const generateAiQuiz = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(readInput)
  .handler(async ({ context, data }): Promise<QuizDraft> => {
    await requirePro(context.userId);
    const key = process.env.XAI_API_KEY;
    if (!key) throw new Error("ЖИ кілті бапталмаған");
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(50_000),
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4.20-non-reasoning",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Сен QuizMaster редакторысың. Тек JSON қайтар. Сұрақтар қазақ тілінде, нақты және қысқа. Әр сұрақта дәл 4 нұсқа. correct — дұрыс нұсқаның индексі 0..3. Нұсқалар қайталанбасын. Жауапты әрқашан бір нұсқаға ғана сайла.",
          },
          {
            role: "user",
            content: `Пән: ${data.subject}. Тақырып: ${data.topic}. Дәл ${data.size} сұрақ. JSON пішіні: {"title":"","description":"","questions":[{"prompt":"","options":["","","",""],"correct":0}]}`,
          },
        ],
      }),
    });
    if (!response.ok) throw new Error("ЖИ жауап бермеді");
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error("ЖИ жауап бермеді");
    return readDraft(content, data.size, data.subject, data.topic);
  });
