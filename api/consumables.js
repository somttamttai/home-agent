// Vercel Serverless Function — /api/consumables/*
import * as logic from './_lib/logic.js';
import { BadRequest, NotFound } from './_lib/logic.js';
import { parseUrl, readBody, runHandler } from './_lib/respond.js';

export default async function handler(req, res) {
  await runHandler(req, res, async () => {
    const { path } = parseUrl(req);
    const method = req.method;

    // /api/consumables
    if (path === '/api/consumables') {
      if (method === 'GET') return await logic.listConsumables();
      if (method === 'POST') return await logic.createConsumable(readBody(req));
    }

    // /api/consumables/alerts/low-stock  (고정 경로 우선)
    if (path === '/api/consumables/alerts/low-stock' && method === 'GET') {
      return await logic.lowStockAlerts();
    }

    // /api/consumables/{cid}
    const prefix = '/api/consumables/';
    if (path.startsWith(prefix)) {
      const tail = path.slice(prefix.length);
      if (tail.includes('/')) throw new NotFound(`no route: ${method} ${path}`);
      const cid = parseInt(tail, 10);
      if (Number.isNaN(cid)) throw new BadRequest('invalid id');
      if (method === 'GET')    return await logic.getConsumable(cid);
      if (method === 'PATCH')  return await logic.updateConsumable(cid, readBody(req));
      if (method === 'DELETE') return await logic.deleteConsumable(cid);
    }

    throw new NotFound(`no route: ${method} ${path}`);
  });
}
