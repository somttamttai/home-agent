// Vercel Serverless Function — /api/notifications/*
import * as logic from './_lib/logic.js';
import { BadRequest, NotFound } from './_lib/logic.js';
import { parseUrl, runHandler } from './_lib/respond.js';
import { authenticateRequest } from './_lib/auth.js';

export default async function handler(req, res) {
  await runHandler(req, res, async () => {
    const { path, query } = parseUrl(req);
    const method = req.method;

    const { householdId } = await authenticateRequest(req);

    if (path === '/api/notifications' && method === 'GET') {
      const unreadOnly = query.unread !== 'false';
      return await logic.listNotifications(householdId, { unreadOnly });
    }

    // PATCH /api/notifications/{id} — 읽음 처리
    const prefix = '/api/notifications/';
    if (path.startsWith(prefix) && method === 'PATCH') {
      const id = parseInt(path.slice(prefix.length), 10);
      if (Number.isNaN(id)) throw new BadRequest('invalid id');
      return await logic.markNotificationRead(id);
    }

    throw new NotFound(`no route: ${method} ${path}`);
  });
}
