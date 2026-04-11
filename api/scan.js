// Vercel Serverless Function — /api/scan/*
import * as logic from './_lib/logic.js';
import { NotFound } from './_lib/logic.js';
import { parseUrl, readBody, runHandler } from './_lib/respond.js';

export default async function handler(req, res) {
  await runHandler(req, res, async () => {
    const { path } = parseUrl(req);
    const method = req.method;

    if (path === '/api/scan/barcode' && method === 'POST') {
      const body = readBody(req);
      return await logic.barcodeLookup(body.code, body.format);
    }

    // 쿠팡 주문내역 등 자유 텍스트를 상품 리스트로 파싱
    if (path === '/api/scan/parse-text' && method === 'POST') {
      const body = readBody(req);
      return await logic.parseOrderText(body.text);
    }

    // OCR 은 🔒 준비중 스텁 응답만 (multipart 파싱 불필요)
    if (path === '/api/scan/product-image' && method === 'POST') {
      return logic.recognizeProductImage();
    }

    if (path === '/api/scan/receipt' && method === 'POST') {
      return logic.parseReceipt();
    }

    throw new NotFound(`no route: ${method} ${path}`);
  });
}
