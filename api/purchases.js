// Vercel Serverless Function — /api/purchases/*
import * as logic from './_lib/logic.js';
import { BadRequest, NotFound } from './_lib/logic.js';
import { parseUrl, readBody, runHandler } from './_lib/respond.js';
import { authenticateRequest } from './_lib/auth.js';

export default async function handler(req, res) {
  await runHandler(req, res, async () => {
    const { path } = parseUrl(req);
    const method = req.method;

    const { householdId } = await authenticateRequest(req);

    // POST /api/purchases — 구매 이력 저장
    if (path === '/api/purchases' && method === 'POST') {
      const body = readBody(req);
      body.household_id = householdId;
      return await logic.createPurchase(body);
    }

    // PATCH /api/purchases/{id} — purchase_type 수정
    const prefix = '/api/purchases/';
    if (path.startsWith(prefix)) {
      const tail = path.slice(prefix.length);
      // /api/purchases/{id}/classify — 조기구매 팝업 응답
      if (tail.endsWith('/classify') && method === 'POST') {
        const id = parseInt(tail.slice(0, -'/classify'.length), 10);
        if (Number.isNaN(id)) throw new BadRequest('invalid id');
        const body = readBody(req);
        return await logic.classifyEarlyPurchase(id, body.choice);
      }
      if (tail.includes('/')) throw new NotFound(`no route: ${method} ${path}`);
      const id = parseInt(tail, 10);
      if (Number.isNaN(id)) throw new BadRequest('invalid id');

      if (method === 'GET') {
        // GET /api/purchases/{consumable_id} — 구매 이력 조회
        return await logic.getPurchaseHistory(id, householdId);
      }
      if (method === 'PATCH') {
        const body = readBody(req);
        return await logic.updatePurchaseType(id, body.purchase_type);
      }
    }

    throw new NotFound(`no route: ${method} ${path}`);
  });
}
