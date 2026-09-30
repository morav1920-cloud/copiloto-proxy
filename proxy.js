// ===== Proxy de tráfico Copiloto Urbano MX para Railway =====
// Oculta tu API key de TomTom y evita problemas de CORS.
// Despliegue: Railway -> New Project -> Deploy from GitHub repo
// Variables de entorno: TOMTOM_KEY=tu_api_key_aqui
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
const KEY = process.env.TOMTOM_KEY || '';

app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*'); // restringe a tu dominio en producción
  next();
});

app.get('/health', (req, res) => res.json({ ok: true, key: KEY ? 'configurada' : 'falta TOMTOM_KEY' }));

app.get('/traffic', async (req, res) => {
  const lat = parseFloat(req.query.lat), lon = parseFloat(req.query.lon);
  if (!lat || !lon) return res.status(400).json({ error: 'Faltan lat y lon' });
  if (!KEY) return res.status(500).json({ error: 'Falta la variable TOMTOM_KEY en Railway' });
  const d = 0.12; // ~13 km a la redonda
  const url = 'https://api.tomtom.com/traffic/services/5/incidentDetails'
    + '?bbox=' + (lon - d) + ',' + (lat - d) + ',' + (lon + d) + ',' + (lat + d)
    + '&fields={incidents{properties{iconCategory,magnitudeOfDelay,events{description},delay,roadNumbers}}}'
    + '&language=es-419&key=' + KEY;
  try {
    const r = await fetch(url);
    res.status(r.status).json(await r.json());
  } catch (e) {
    res.status(502).json({ error: 'No se pudo contactar a TomTom' });
  }
});

app.listen(PORT, () => console.log('Proxy Copiloto listo en puerto ' + PORT));
