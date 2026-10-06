const express = require('express');
const path = require('path');
// Se cambia la forma de importar 'node-fetch' para mayor compatibilidad
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();

const PORT = process.env.PORT || 3001;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:9001';

app.use(express.static(path.join(__dirname, '/')));
app.use(express.json());

app.get('/api/coordenadas', async (req, res) => {
  try {
    const bearer = req.get('Authorization');
    if (!bearer) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const resp = await fetch(`${BACKEND_URL}/api/coordenadas`, {
      headers: { Authorization: bearer }
    });

    // If backend did not return JSON or returned non-ok, forward status and body
    const text = await resp.text().catch(() => '');
    if (!resp.ok) {
      return res.status(resp.status).json({ error: 'backend error', detail: text });
    }

    // Try to parse JSON
    let data;
    try {
      data = JSON.parse(text || '[]');
    } catch (e) {
      console.error('Failed to parse backend JSON:', e, 'raw:', text);
      return res.status(502).json({ error: 'invalid backend response', detail: text });
    }

    return res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'proxy error', details: err.message });
  }
});

app.post('/authenticate', async (req, res) => {
  try {
    const apiKey = req.get('APIkey'); // Se usa req.get para consistencia
    // Construir cabeceras evitando enviar 'undefined'
    const headers = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['APIkey'] = apiKey;
    }

    const resp = await fetch(`${BACKEND_URL}/authenticate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body)
    });

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json(data);
    }
    
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'proxy error', details: err.message });
  }
});

// Proxy: obtener trayectos por codigo de ruta
// Proxy: obtener trayectos por codigo de ruta
app.get('/api/trayectos/:codigo', async (req, res) => {
  try {
    const codigo = req.params.codigo;
    const bearer = req.get('Authorization');
    const headers = {};
    if (bearer) headers['Authorization'] = bearer;

    const resp = await fetch(`${BACKEND_URL}/api/trayectos/${encodeURIComponent(codigo)}`, { headers });
    const text = await resp.text().catch(() => '');
    if (!resp.ok) return res.status(resp.status).json({ error: 'backend error', detail: text });
    try {
      const data = JSON.parse(text || 'null');
      return res.json(data);
    } catch (e) {
      return res.status(502).json({ error: 'invalid backend response', detail: text });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'proxy error', details: err.message });
  }
});

// Proxy: obtener coordenadas asociadas a un codigo de ruta
app.get('/api/trayectos/:codigo/coordenadas', async (req, res) => {
  try {
    const codigo = req.params.codigo;
    const bearer = req.get('Authorization');
    const headers = {};
    if (bearer) headers['Authorization'] = bearer;

    const resp = await fetch(`${BACKEND_URL}/api/trayectos/${encodeURIComponent(codigo)}/coordenadas`, { headers });
    const text = await resp.text().catch(() => '');
    if (!resp.ok) return res.status(resp.status).json({ error: 'backend error', detail: text });
    try { return res.json(JSON.parse(text || 'null')); } catch (e) { return res.status(502).json({ error: 'invalid backend response', detail: text }); }
  } catch (err) { console.error(err); res.status(500).json({ error: 'proxy error', details: err.message }); }
});

// Proxy: obtener codigos de ruta por id de persona (conductor)
app.get('/api/trayectos/codigos/persona/:personaId', async (req, res) => {
  try {
    const id = req.params.personaId;
    const bearer = req.get('Authorization');
    const headers = {};
    if (bearer) headers['Authorization'] = bearer;
    const resp = await fetch(`${BACKEND_URL}/api/trayectos/codigos/persona/${encodeURIComponent(id)}`, { headers });
    const text = await resp.text().catch(() => '');
    if (!resp.ok) return res.status(resp.status).json({ error: 'backend error', detail: text });
    try { return res.json(JSON.parse(text || 'null')); } catch (e) { return res.status(502).json({ error: 'invalid backend response', detail: text }); }
  } catch (err) { console.error(err); res.status(500).json({ error: 'proxy error', details: err.message }); }
});

// Proxy: obtener codigos de ruta por placa
app.get('/api/trayectos/codigos/placa/:placa', async (req, res) => {
  try {
    const placa = req.params.placa;
    const bearer = req.get('Authorization');
    const headers = {};
    if (bearer) headers['Authorization'] = bearer;
    const resp = await fetch(`${BACKEND_URL}/api/trayectos/codigos/placa/${encodeURIComponent(placa)}`, { headers });
    const text = await resp.text().catch(() => '');
    if (!resp.ok) return res.status(resp.status).json({ error: 'backend error', detail: text });
    try { return res.json(JSON.parse(text || 'null')); } catch (e) { return res.status(502).json({ error: 'invalid backend response', detail: text }); }
  } catch (err) { console.error(err); res.status(500).json({ error: 'proxy error', details: err.message }); }
});

// Proxy: codigos-por-placa-conductor
app.get('/api/trayectos/codigos-por-placa-conductor/:placa', async (req, res) => {
  try {
    const placa = req.params.placa;
    const bearer = req.get('Authorization');
    const headers = {};
    if (bearer) headers['Authorization'] = bearer;
    const resp = await fetch(`${BACKEND_URL}/api/trayectos/codigos-por-placa-conductor/${encodeURIComponent(placa)}`, { headers });
    const text = await resp.text().catch(() => '');
    if (!resp.ok) return res.status(resp.status).json({ error: 'backend error', detail: text });
    try { return res.json(JSON.parse(text || 'null')); } catch (e) { return res.status(502).json({ error: 'invalid backend response', detail: text }); }
  } catch (err) { console.error(err); res.status(500).json({ error: 'proxy error', details: err.message }); }
});

// Proxy: obtener rutas no habilitadas o restringidas
app.get('/api/trayectos/no-habilitado-o-restringido', async (req, res) => {
  try {
    const bearer = req.get('Authorization');
    const headers = {};
    if (bearer) headers['Authorization'] = bearer;
    const resp = await fetch(`${BACKEND_URL}/api/trayectos/no-habilitado-o-restringido`, { headers });
    const text = await resp.text().catch(() => '');
    if (!resp.ok) return res.status(resp.status).json({ error: 'backend error', detail: text });
    try { return res.json(JSON.parse(text || 'null')); } catch (e) { return res.status(502).json({ error: 'invalid backend response', detail: text }); }
  } catch (err) { console.error(err); res.status(500).json({ error: 'proxy error', details: err.message }); }
});

// Proxy: crear vehiculo (POST) - reenvía Authorization y APIkey
app.post('/api/vehiculos', async (req, res) => {
  try {
    const bearer = req.get('Authorization');
    const apiKey = req.get('APIkey');
    const headers = { 'Content-Type': 'application/json' };
    if (bearer) headers['Authorization'] = bearer;
    if (apiKey) headers['APIkey'] = apiKey;

    const resp = await fetch(`${BACKEND_URL}/api/vehiculos`, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body)
    });

    const text = await resp.text().catch(() => '');
    if (!resp.ok) return res.status(resp.status).json({ error: 'backend error', detail: text });
    try { return res.json(JSON.parse(text || 'null')); } catch (e) { return res.status(502).json({ error: 'invalid backend response', detail: text }); }
  } catch (err) { console.error(err); res.status(500).json({ error: 'proxy error', details: err.message }); }
});

// Proxy: agregar documento con PDF al vehiculo
app.post('/api/vehiculos/:vehiculoId/agregar-documento-con-pdf', async (req, res) => {
  try {
    const vehiculoId = req.params.vehiculoId;
    const bearer = req.get('Authorization');
    const apiKey = req.get('APIkey');
    const headers = { 'Content-Type': 'application/json' };
    if (bearer) headers['Authorization'] = bearer;
    if (apiKey) headers['APIkey'] = apiKey;

    const resp = await fetch(`${BACKEND_URL}/api/vehiculos/${encodeURIComponent(vehiculoId)}/agregar-documento-con-pdf`, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body)
    });

    const text = await resp.text().catch(() => '');
    if (!resp.ok) return res.status(resp.status).json({ error: 'backend error', detail: text });
    try { return res.json(JSON.parse(text || 'null')); } catch (e) { return res.status(502).json({ error: 'invalid backend response', detail: text }); }
  } catch (err) { console.error(err); res.status(500).json({ error: 'proxy error', details: err.message }); }
});


app.listen(PORT, () => console.log(`Frontend server running on http://localhost:${PORT}`));