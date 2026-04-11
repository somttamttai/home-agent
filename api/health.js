// Vercel Serverless Function — /api/health
import { runHandler } from './_lib/respond.js';

export default async function handler(req, res) {
  await runHandler(req, res, async () => ({
    status: 'ok',
    service: 'home-agent',
  }));
}
