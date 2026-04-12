// Vercel Serverless Function — /api/consumables/*
import * as logic from './_lib/logic.js';
import { BadRequest, NotFound } from './_lib/logic.js';
import { parseUrl, readBody, runHandler } from './_lib/respond.js';
import { authenticateRequest, extractToken } from './_lib/auth.js';

export default async function handler(req, res) {
  await runHandler(req, res, async () => {
    const { path } = parseUrl(req);
    const method = req.method;

    let householdId = null;
    let token = null;
    try {
      const auth = await authenticateRequest(req);
      householdId = auth.householdId;
      token = auth.token;
    } catch {
      // 인증 없이도 동작 (하위 호환)
      token = extractToken(req) || null;
    }

    // /api/consumables
    if (path === '/api/consumables') {
      if (method === 'GET') return await logic.listConsumables(householdId, token);
      if (method === 'POST') {
        const body = readBody(req);
        if (householdId) body.household_id = householdId;
        return await logic.createConsumable(body, token);
      }
    }

    // /api/consumables/alerts/low-stock
    if (path === '/api/consumables/alerts/low-stock' && method === 'GET') {
      return await logic.lowStockAlerts(householdId, token);
    }

    // /api/consumables/{cid}
    const prefix = '/api/consumables/';
    if (path.startsWith(prefix)) {
      const tail = path.slice(prefix.length);
      if (tail.includes('/')) throw new NotFound(`no route: ${method} ${path}`);
      const cid = parseInt(tail, 10);
      if (Number.isNaN(cid)) throw new BadRequest('invalid id');
      if (method === 'GET')    return await logic.getConsumable(cid, token);
      if (method === 'PATCH')  return await logic.updateConsumable(cid, readBody(req), token);
      if (method === 'DELETE') return await logic.deleteConsumable(cid, token);
    }

    throw new NotFound(`no route: ${method} ${path}`);
  });
}
