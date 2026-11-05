import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";

export const PRO_PRICE_KZT = 2500;

export type ProStatus = {
  active: boolean;
  priceKzt: number;
  endsAt: string | null;
};

export async function requirePro(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ ok: boolean }>`
    select (status = 'active' and current_period_end > now()) as ok
    from subscriptions
    where user_id = ${userId}
  `;
  if (!rows[0]?.ok) throw new Error("Өз квизіңді жасау үшін Pro керек");
}

export const getProStatus = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ProStatus> => {
    const sql = await getSql();
    const rows = await sql<{ ends_at: string; active: boolean }>`
      select current_period_end::text as ends_at,
             (status = 'active' and current_period_end > now()) as active
      from subscriptions
      where user_id = ${context.userId}
    `;
    return {
      active: Boolean(rows[0]?.active),
      priceKzt: PRO_PRICE_KZT,
      endsAt: rows[0]?.ends_at ?? null,
    };
  });

export const startPro = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ProStatus> => {
    const sql = await getSql();
    const rows = await sql<{ ends_at: string }>`
      insert into subscriptions (user_id, plan, price_kzt, status, current_period_end)
      values (${context.userId}, 'pro', ${PRO_PRICE_KZT}, 'active', now() + interval '30 days')
      on conflict (user_id) do update
        set plan = 'pro',
            price_kzt = ${PRO_PRICE_KZT},
            status = 'active',
            current_period_end = greatest(subscriptions.current_period_end, now()) + interval '30 days'
      returning current_period_end::text as ends_at
    `;
    return { active: true, priceKzt: PRO_PRICE_KZT, endsAt: rows[0]?.ends_at ?? null };
  });
