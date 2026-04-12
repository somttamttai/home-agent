// Vercel Serverless Function — /api/prices/*
import * as logic from './_lib/logic.js';
import { BadRequest, NotFound } from './_lib/logic.js';
import { parseUrl, runHandler } from './_lib/respond.js';

export default async function handler(req, res) {
  await runHandler(req, res, async () => {
    const { path, query } = parseUrl(req);
    const method = req.method;

    // /api/prices/compare?query=...&ply=...
    if (path === '/api/prices/compare' && method === 'GET') {
      const ply = query.ply ? parseInt(query.ply, 10) : null;
      return await logic.comparePrices(query.query, ply);
    }

    // /api/prices/history/{cid}?limit=...
    const historyPrefix = '/api/prices/history/';
    if (path.startsWith(historyPrefix) && method === 'GET') {
      const cid = parseInt(path.slice(historyPrefix.length), 10);
      if (Number.isNaN(cid)) throw new BadRequest('invalid id');
      const limit = parseInt(query.limit || '50', 10);
      return await logic.priceHistory(cid, limit);
    }

    // /api/prices/refresh/{cid}
    const refreshPrefix = '/api/prices/refresh/';
    if (path.startsWith(refreshPrefix) && method === 'POST') {
      const cid = parseInt(path.slice(refreshPrefix.length), 10);
      if (Number.isNaN(cid)) throw new BadRequest('invalid id');
      return await logic.refreshPrice(cid);
    }

    throw new NotFound(`no route: ${method} ${path}`);
  });
}
