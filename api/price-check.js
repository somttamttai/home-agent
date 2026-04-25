// Vercel Cron: 매일 오전 9시 — 전체 소모품 가격 체크 + 알림 생성
import * as logic from './_lib/logic.js';
import { runHandler } from './_lib/respond.js';

export default async function handler(req, res) {
  await runHandler(req, res, async () => {
    // Vercel cron은 인증 없이 호출하지만, CRON_SECRET 이 있으면 검증
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers['authorization'] || '';
      if (auth !== `Bearer ${secret}`) {
        res.statusCode = 401;
        return { error: 'unauthorized' };
      }
    }
    return await logic.runPriceCheck();
  });
}
