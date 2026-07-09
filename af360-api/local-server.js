// Servidor local para desenvolvimento/testes (não usado no Vercel,
// que usa api/index.js diretamente). Carrega variáveis do .env se existir.
try {
  require('dotenv').config();
} catch {
  // dotenv é opcional: se não estiver instalado, seguimos usando
  // variáveis de ambiente já exportadas no shell.
}

const app = require('./src/app');

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`af360-api rodando em http://localhost:${port}`);
  console.log(`Teste: http://localhost:${port}/api/health`);
});
