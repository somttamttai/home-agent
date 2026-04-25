// Vercel Serverless Function — /api/prices/*
import * as logic from './_lib/logic.js';
import { BadRequest, NotFound } from './_lib/logic.js';
import { parseUrl, runHandler } from './_lib/respond.js';

export default async function handler(req, res) {
  await runHandler(req, res, async () => {
    const { path, query } = parseUrl(req);
    const method = req.method;

    // /api/prices/compare?query=...&ply=...&size=min-max&consumable_id=...
    if (path === '/api/prices/compare' && method === 'GET') {
      const plyRaw = query.ply ? parseInt(query.ply, 10) : null;
      const ply = (plyRaw != null && !Number.isNaN(plyRaw) && plyRaw > 0) ? plyRaw : null;

      let sizeMin = null;
      let sizeMax = null;
      if (query.size) {
        const [minS, maxS] = String(query.size).split('-');
        const minP = parseFloat(minS);
        const maxP = parseFloat(maxS);
        if (!Number.isNaN(minP) && minP > 0) sizeMin = minP;
        if (!Number.isNaN(maxP) && maxP > 0) sizeMax = maxP;
      }

      const cidRaw = query.consumable_id ? parseInt(query.consumable_id, 10) : null;
      const cid = (cidRaw != null && !Number.isNaN(cidRaw)) ? cidRaw : null;
      if (cid != null) {
        return await logic.comparePricesWithContext(query.query, ply, cid, sizeMin, sizeMax);
      }
      return await logic.comparePrices(query.query, ply, sizeMin, sizeMax);
    }

    // /api/prices/history/{cid}?limit=...
    const historyPrefix = '/api/prices/history/';
    if (path.startsWith(historyPrefix) && method === 'GET') {
      const cid = parseInt(path.slice(historyPrefix.length), 10);
      if (Number.isNaN(cid)) throw new BadRequest('invalid id');
      const limitRaw = parseInt(query.limit || '50', 10);
      const limit = (!Number.isNaN(limitRaw) && limitRaw > 0) ? Math.min(limitRaw, 200) : 50;
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
