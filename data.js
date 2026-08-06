// api/data.js — Vercel Serverless Function (Node.js runtime)
// Returns the latest published dashboard dataset (data.json) from Vercel Blob.
// The public dashboard (index.html) calls this on every page load.
'use strict';

const { list } = require('@vercel/blob');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    res.status(404).json({ error: 'Nenhum Blob Store conectado ainda.' });
    return;
  }

  try {
    const { blobs } = await list({ prefix: 'data.json', limit: 1 });
    if (!blobs.length) {
      res.status(404).json({ error: 'Nenhuma planilha publicada ainda.' });
      return;
    }
    const resp = await fetch(blobs[0].url, { cache: 'no-store' });
    if (!resp.ok) {
      res.status(502).json({ error: 'Falha ao buscar os dados publicados.' });
      return;
    }
    const json = await resp.text();
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(json);
  } catch (err) {
    console.error('data error:', err);
    res.status(500).json({ error: err.message });
  }
};
