// api/upload.js — Vercel Serverless Function (Node.js runtime)
// Receives the raw .xlsx bytes in the request body, parses it, computes the
// dashboard dataset, and publishes it to Vercel Blob as a fixed-path JSON file
// so every visitor to the public dashboard sees the same, latest data.
'use strict';

const { parseWorkbookBuffer } = require('../lib/parseWorkbook');
const { computeFromOrders } = require('../lib/compute');
const { put } = require('@vercel/blob');

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

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  if (!process.env.UPLOAD_PASSWORD) {
    res.status(500).json({ error: 'UPLOAD_PASSWORD não está configurada nas variáveis de ambiente do projeto na Vercel.' });
    return;
  }
  const password = req.headers['x-upload-password'];
  if (!password || password !== process.env.UPLOAD_PASSWORD) {
    res.status(401).json({ error: 'Senha incorreta.' });
    return;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(500).json({ error: 'Nenhum Blob Store conectado a este projeto na Vercel. Veja o README para o passo de configuração.' });
    return;
  }

  try {
    const buffer = await getRawBody(req);
    if (!buffer || buffer.length < 100) {
      res.status(400).json({ error: 'Arquivo vazio ou inválido.' });
      return;
    }

    const { orders, extra } = parseWorkbookBuffer(buffer);
    if (!orders.length) {
      res.status(400).json({
        error: 'Não encontrei pedidos válidos na aba "Dados Detalhados" dessa planilha. Confirme se o arquivo segue o modelo esperado.'
      });
      return;
    }

    const data = computeFromOrders(orders, extra);
    const json = JSON.stringify(data);

    const blob = await put('data.json', json, {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true
    });

    res.status(200).json({
      ok: true,
      pedidos: orders.length,
      periodo: data.periodLabel,
      faturamento: data.kpis.faturamento,
      url: blob.url,
      generatedAt: data.generatedAt
    });
  } catch (err) {
    console.error('upload error:', err);
    res.status(500).json({ error: 'Erro ao processar a planilha: ' + err.message });
  }
};
