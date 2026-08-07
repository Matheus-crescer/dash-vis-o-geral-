// api/upload.js — Vercel Serverless Function (Node.js runtime)
// Receives the raw .xlsx bytes in the request body, parses it, computes the
// dashboard dataset, and publishes it to Vercel Blob as a fixed-path JSON file
// so every visitor to the public dashboard sees the same, latest data.
//
// Everything below runs inside one top-level try/catch (including the
// require() calls) so that ANY failure — a bad dependency, a parsing error,
// a Blob Store problem — always comes back to the browser as readable JSON
// instead of Vercel's generic crash page (which is HTML/text and breaks
// `resp.json()` on the client with a confusing "Unexpected token" error).
'use strict';

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    // Some Vercel runtimes may already buffer non-standard content types into req.body.
    if (req.body && Buffer.isBuffer(req.body)) return resolve(req.body);
    if (typeof req.body === 'string' && req.body.length) return resolve(Buffer.from(req.body, 'binary'));
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function safeSend(res, status, payload) {
  try {
    res.status(status).json(payload);
  } catch (e) {
    try { res.end(JSON.stringify(payload)); } catch (e2) { /* give up */ }
  }
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      safeSend(res, 405, { error: 'Método não permitido.' });
      return;
    }

    if (!process.env.UPLOAD_PASSWORD) {
      safeSend(res, 500, { error: 'UPLOAD_PASSWORD não está configurada nas variáveis de ambiente do projeto na Vercel.' });
      return;
    }
    const password = req.headers['x-upload-password'];
    if (!password || password !== process.env.UPLOAD_PASSWORD) {
      safeSend(res, 401, { error: 'Senha incorreta.' });
      return;
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      safeSend(res, 500, { error: 'Nenhum Blob Store conectado a este projeto na Vercel (falta a variável BLOB_READ_WRITE_TOKEN). Veja o README, passo 2.' });
      return;
    }

    // Lazy require: if a dependency failed to install/bundle, we catch it
    // here and respond with JSON instead of crashing before this line.
    let parseWorkbookBuffer, computeFromOrders, put;
    try {
      ({ parseWorkbookBuffer } = require('../lib/parseWorkbook'));
      ({ computeFromOrders } = require('../lib/compute'));
      ({ put } = require('@vercel/blob'));
    } catch (reqErr) {
      console.error('require error:', reqErr);
      safeSend(res, 500, { error: 'Falha ao carregar dependências no servidor: ' + reqErr.message });
      return;
    }

    const buffer = await getRawBody(req);
    if (!buffer || buffer.length < 100) {
      safeSend(res, 400, { error: 'Arquivo vazio ou inválido.' });
      return;
    }

    let orders, extra;
    try {
      ({ orders, extra } = parseWorkbookBuffer(buffer));
    } catch (parseErr) {
      console.error('parse error:', parseErr);
      safeSend(res, 400, { error: 'Erro ao ler a planilha: ' + parseErr.message });
      return;
    }

    if (!orders.length) {
      safeSend(res, 400, {
        error: 'Não encontrei pedidos válidos na aba "Dados Detalhados" dessa planilha. Confirme se o arquivo segue o modelo esperado.'
      });
      return;
    }

    const data = computeFromOrders(orders, extra);
    const json = JSON.stringify(data);

    let blob;
    try {
      blob = await put('data.json', json, {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true
      });
    } catch (blobErr) {
      console.error('blob put error:', blobErr);
      safeSend(res, 500, { error: 'Erro ao publicar no Blob Store: ' + blobErr.message });
      return;
    }

    safeSend(res, 200, {
      ok: true,
      pedidos: orders.length,
      periodo: data.periodLabel,
      faturamento: data.kpis.faturamento,
      url: blob.url,
      generatedAt: data.generatedAt
    });
  } catch (err) {
    console.error('upload fatal error:', err);
    safeSend(res, 500, { error: 'Erro inesperado: ' + (err && err.message ? err.message : String(err)) });
  }
};
