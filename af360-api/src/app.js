const express = require('express');
const cors = require('cors');

const { requireApiKey } = require('./auth');
const healthRoutes = require('./routes/health');
const empresasRoutes = require('./routes/empresas');
const cargosRoutes = require('./routes/cargos');
const setoresRoutes = require('./routes/setores');
const colaboradoresRoutes = require('./routes/colaboradores');

const app = express();

app.use(cors());
app.use(express.json());

// /api/health e /api/health/db ficam abertos (sem API key) para
// facilitar diagnóstico de deploy/conectividade.
app.use('/api/health', healthRoutes);

// Todo o resto exige x-api-key.
app.use('/api', requireApiKey);

app.use('/api/empresas', empresasRoutes);
app.use('/api/rh/cargos', cargosRoutes);
app.use('/api/rh/setores', setoresRoutes);
app.use('/api/rh/colaboradores', colaboradoresRoutes);

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'af360-api', message: 'Veja /api/health' });
});

app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'not_found', path: req.path });
});

// Handler de erro genérico (evita expor stack trace em produção).
app.use((err, req, res, next) => {
  console.error('[app] erro não tratado:', err);
  res.status(500).json({ ok: false, error: 'internal_error' });
});

module.exports = app;
