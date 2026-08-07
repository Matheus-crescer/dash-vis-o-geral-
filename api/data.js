// api/data.js — Vercel Serverless Function (Node.js runtime)
// Returns the latest published dashboard dataset (data.json) from Vercel Blob.
// The public dashboard (index.html) calls this on every page load.
'use strict';

function safeSend(res, status, payload) {
  try {
    res.status(status).json(payload);
  } catch (e) {
    try { res.end(JSON.stringify(payload)); } catch (e2) { /* give up */ }
  }
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      safeSend(res, 405, { error: 'Método não permitido.' });
      return;
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      safeSend(res, 404, { error: 'Nenhum Blob Store conectado ainda.' });
      return;
    }

    let list;
    try {
      ({ list } = require('@vercel/blob'));
    } catch (reqErr) {
      console.error('require error:', reqErr);
      safeSend(res, 500, { error: 'Falha ao carregar dependências no servidor: ' + reqErr.message });
      return;
    }

    const { blobs } = await list({ prefix: 'data.json', limit: 1 });
    if (!blobs.length) {
      safeSend(res, 404, { error: 'Nenhuma planilha publicada ainda.' });
      return;
    }
    const resp = await fetch(blobs[0].url, { cache: 'no-store' });
    if (!resp.ok) {
      safeSend(res, 502, { error: 'Falha ao buscar os dados publicados.' });
      return;
    }
    const json = await resp.text();
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(json);
  } catch (err) {
    console.error('data fatal error:', err);
    safeSend(res, 500, { error: err && err.message ? err.message : String(err) });
  }
};
