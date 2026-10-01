// ===== Proxy Copiloto Urbano MX v2 (tráfico + base de datos de encuestas) =====
const express = require('express');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
const KEY = process.env.TOMTOM_KEY || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'cambia-esta-clave';
const DB_FILE = './feedbacks.json';

app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => { res.set('Access-Control-Allow-Origin', '*'); next(); });

app.get('/health', (req, res) => res.json({ ok: true, key: KEY ? 'configurada' : 'falta TOMTOM_KEY' }));

app.get('/traffic', async (req, res) => {
  const lat = parseFloat(req.query.lat), lon = parseFloat(req.query.lon);
  if (!lat || !lon) return res.status(400).json({ error: 'Faltan lat y lon' });
  if (!KEY) return res.status(500).json({ error: 'Falta TOMTOM_KEY' });
  const d = 0.12;
  const url = 'https://api.tomtom.com/traffic/services/5/incidentDetails'
    + '?bbox=' + (lon - d) + ',' + (lat - d) + ',' + (lon + d) + ',' + (lat + d)
    + '&fields={incidents{properties{iconCategory,magnitudeOfDelay,events{description},delay,roadNumbers}}}'
    + '&language=es-419&key=' + KEY;
  try { const r = await fetch(url); res.status(r.status).json(await r.json()); }
  catch (e) { res.status(502).json({ error: 'No se pudo contactar a TomTom' }); }
});

// ---- Encuestas: guardar y consultar ----
function leerDB(){ try { return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); } catch(e){ return []; } }
app.post('/feedback', (req, res) => {
  const r = req.body || {};
  if (!r.respuestas || typeof r.respuestas !== 'object') return res.status(400).json({ error: 'Formato inválido' });
  const lista = leerDB();
  lista.push({ ts: new Date().toISOString(), ...r });
  fs.writeFileSync(DB_FILE, JSON.stringify(lista, null, 1));
  res.json({ ok: true, total: lista.length });
});
app.get('/admin', (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.status(403).send('Acceso denegado');
  const lista = leerDB().slice().reverse();
  const filas = lista.map(f => '<tr><td>'+new Date(f.ts).toLocaleString('es-MX')+
    '</td><td>'+(f.nombre||'—')+'</td><td>'+(f.estado||'—')+'</td><td>'+(f.vehiculo||'—')+'</td><td>'+
    Object.entries(f.respuestas||{}).map(([k,v])=>'<b>'+k+':</b> '+v).join('<br>')+'</td></tr>').join('');
  res.send('<meta charset="utf-8"><title>Encuestas Copiloto</title><style>body{font-family:sans-serif;background:#0f1318;color:#eee;padding:20px}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border:1px solid #333;padding:6px;vertical-align:top}th{background:#1a222c;text-align:left}</style><h1>📋 Encuestas del piloto ('+lista.length+')</h1><table><tr><th>Fecha</th><th>Conductor</th><th>Estado</th><th>Vehículo</th><th>Respuestas</th></tr>'+filas+'</table>');
});
app.listen(PORT, () => console.log('Proxy v2 listo en puerto ' + PORT));
