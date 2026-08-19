const express = require('express');
const cors = require('cors');

const { requireApiKey } = require('./auth');
const healthRoutes = require('./routes/health');
const empresasRoutes = require('./routes/empresas');
const cargosRoutes = require('./routes/cargos');
const unidadesRoutes = require('./routes/unidades');
const setoresRoutes = require('./routes/setores');
const colaboradoresRoutes = require('./routes/colaboradores');
const rhHistoricoContratacoesRoutes = require('./routes/rhHistoricoContratacoes');
const rhDashboardRoutes = require('./routes/rhDashboard');
const diretoriaRoutes = require('./routes/diretoria');
const diretoriaPainelRoutes = require('./routes/diretoriaPainel');
const diretoriaProcessosRoutes = require('./routes/diretoriaProcessos');
const conversasRoutes = require('./routes/conversas');
const authRoutes = require('./routes/auth');
const auth2faRoutes = require('./routes/auth2fa');
const adminRoutes = require('./routes/admin');
const rhReembolsosRoutes = require('./routes/rhReembolsos');
const rhFeriasRoutes = require('./routes/rhFerias');
const rhSolicitacoesRoutes = require('./routes/rhSolicitacoes');
const rhUniformesRoutes = require('./routes/rhUniformes');
const rhCalendarioRoutes = require('./routes/rhCalendario');
const rhTreinamentosConteudoRoutes = require('./routes/rhTreinamentosConteudo');
const rhComunicadosRoutes = require('./routes/rhComunicados');
const rhDependentesRoutes = require('./routes/rhDependentes');
const rhPromocoesRoutes = require('./routes/rhPromocoes');
const rhPremiacoesEscritaRoutes = require('./routes/rhPremiacoesEscrita');
const rhTransferenciasEscritaRoutes = require('./routes/rhTransferenciasEscrita');
const rhDocumentosUploadRoutes = require('./routes/rhDocumentosUpload');
const rhAdmissaoConformidadeRoutes = require('./routes/rhAdmissaoConformidade');
const rhComunicadosUploadRoutes = require('./routes/rhComunicadosUpload');
const rhImportacoesPdfRoutes = require('./routes/rhImportacoesPdf');
const rhMetasRoutes = require('./routes/rhMetas');
const rhJornadasRoutes = require('./routes/rhJornadas');

const app = express();

app.use(cors());
// Limite padrão do express.json() é 100kb — aumentado pra caber upload de
// documento em base64 (até ~10MB de arquivo vira ~14MB em base64 + payload).
app.use(express.json({ limit: '15mb' }));

// /api/health e /api/health/db ficam abertos (sem API key) para
// facilitar diagnóstico de deploy/conectividade.
app.use('/api/health', healthRoutes);

// Todo o resto exige x-api-key.
app.use('/api', requireApiKey);

app.use('/api/empresas', empresasRoutes);
app.use('/api/rh/cargos', cargosRoutes);
app.use('/api/rh/unidades', unidadesRoutes);
app.use('/api/rh/setores', setoresRoutes);
app.use('/api/rh/colaboradores', colaboradoresRoutes);
app.use('/api/rh/historico-contratacoes', rhHistoricoContratacoesRoutes);
app.use('/api/rh/dashboard', rhDashboardRoutes);
app.use('/api/diretoria', diretoriaRoutes);
app.use('/api/diretoria-painel', diretoriaPainelRoutes);
app.use('/api/diretoria-processos', diretoriaProcessosRoutes);
app.use('/api/diretoria/conversas', conversasRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth/2fa', auth2faRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rh/reembolsos', rhReembolsosRoutes);
app.use('/api/rh/ferias', rhFeriasRoutes);
app.use('/api/rh/solicitacoes', rhSolicitacoesRoutes);
app.use('/api/rh/uniformes', rhUniformesRoutes);
app.use('/api/rh/calendario', rhCalendarioRoutes);
app.use('/api/rh/treinamentos-conteudo', rhTreinamentosConteudoRoutes);
app.use('/api/rh/comunicados', rhComunicadosRoutes);
app.use('/api/rh/dependentes', rhDependentesRoutes);
app.use('/api/rh/promocoes', rhPromocoesRoutes);
app.use('/api/rh/premiacoes-escrita', rhPremiacoesEscritaRoutes);
app.use('/api/rh/transferencias-escrita', rhTransferenciasEscritaRoutes);
app.use('/api/rh/documentos', rhDocumentosUploadRoutes);
app.use('/api/rh/admissao-conformidade', rhAdmissaoConformidadeRoutes);
app.use('/api/rh/comunicados-upload', rhComunicadosUploadRoutes);
app.use('/api/rh/importacoes-pdf', rhImportacoesPdfRoutes);
app.use('/api/rh/metas', rhMetasRoutes);
app.use('/api/rh/jornadas', rhJornadasRoutes);

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'af360-api', message: 'Veja /api/health' });
});

// Página de Política de Privacidade do app AF360, exigida pela Apple App Store
// e pelo Google Play. Fica fora do prefixo /api de propósito, para não exigir
// x-api-key (precisa ser acessível publicamente pelos times de revisão).
app.get('/privacidade', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Política de Privacidade - AF360</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.6; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    h2 { font-size: 18px; margin-top: 32px; }
    p, li { font-size: 15px; }
    .updated { color: #666; font-size: 13px; margin-bottom: 32px; }
  </style>
</head>
<body>
  <h1>Política de Privacidade do AF360</h1>
  <p class="updated">Última atualização: 10 de agosto de 2026</p>

  <p>O AF360 é um aplicativo corporativo interno da American Fuel, destinado exclusivamente a colaboradores, gestores, diretoria e administração da empresa. Esta política explica como tratamos os dados pessoais dos usuários do app, em conformidade com a Lei Geral de Proteção de Dados (LGPD).</p>

  <h2>1. Quem trata os dados</h2>
  <p>A American Fuel é a controladora dos dados coletados pelo AF360. O acesso ao app é restrito a contas corporativas cadastradas pela própria empresa.</p>

  <h2>2. Quais dados coletamos</h2>
  <ul>
    <li>Dados de identificação: nome completo, e-mail corporativo e/ou pessoal, cargo, setor e unidade</li>
    <li>Dados de autenticação: credenciais de login e código de verificação em duas etapas enviado por e-mail</li>
    <li>Conteúdo gerado pelo usuário: solicitações internas de RH (reembolsos, férias, uniformes), mensagens trocadas no canal "Fale com a Diretoria" e anexos (fotos/documentos) enviados nessas solicitações</li>
    <li>Dados de uso do app, como notificações lidas e interação com processos internos</li>
  </ul>

  <h2>3. Para que usamos os dados</h2>
  <p>Os dados são utilizados exclusivamente para viabilizar as funcionalidades do app: autenticação segura, gestão de RH, acompanhamento de processos internos, comunicação entre colaboradores e diretoria, e envio de notificações relevantes ao trabalho do usuário.</p>

  <h2>4. Compartilhamento de dados</h2>
  <p>Os dados não são vendidos nem compartilhados com terceiros para fins de publicidade. O armazenamento é feito em infraestrutura de banco de dados própria da American Fuel, com acesso restrito às áreas internas da empresa.</p>

  <h2>5. Segurança</h2>
  <p>Utilizamos autenticação em duas etapas (verificação por e-mail) para proteger o acesso às contas, além de controle de permissões por perfil (colaborador, RH, diretoria, administrador).</p>

  <h2>6. Retenção e exclusão de dados</h2>
  <p>Os dados são mantidos enquanto o usuário mantiver vínculo ativo com a empresa. Solicitações de exclusão ou correção de dados podem ser feitas diretamente ao RH da American Fuel.</p>

  <h2>7. Direitos do usuário</h2>
  <p>Nos termos da LGPD, o usuário pode solicitar acesso, correção ou exclusão de seus dados pessoais a qualquer momento, entrando em contato com a American Fuel.</p>

  <h2>8. Contato</h2>
  <p>Em caso de dúvidas sobre esta política, entre em contato pelo e-mail: <a href="mailto:rayanne.ernandez@globaltera.com.br">rayanne.ernandez@globaltera.com.br</a></p>
</body>
</html>`);
});

// Página de solicitação de exclusão de dados do app AF360, exigida pelo
// Google Play na declaração de Segurança dos Dados.
app.get('/exclusao-de-dados', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Exclusão de Dados - AF360</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.6; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    h2 { font-size: 18px; margin-top: 32px; }
    p, li { font-size: 15px; }
    .updated { color: #666; font-size: 13px; margin-bottom: 32px; }
  </style>
</head>
<body>
  <h1>Solicitação de Exclusão de Dados do AF360</h1>
  <p class="updated">Última atualização: 10 de agosto de 2026</p>

  <p>O AF360 é o aplicativo corporativo interno da American Fuel. Esta página explica como um colaborador pode solicitar a exclusão de seus dados pessoais coletados pelo app.</p>

  <h2>Como solicitar a exclusão</h2>
  <p>Para solicitar a exclusão dos seus dados, envie um e-mail para <a href="mailto:rayanne.ernandez@globaltera.com.br">rayanne.ernandez@globaltera.com.br</a> a partir do e-mail cadastrado na empresa, informando seu nome completo e solicitando a exclusão da sua conta e dados no AF360.</p>

  <h2>O que é excluído</h2>
  <ul>
    <li>Dados de identificação (nome, e-mail, cargo, setor e unidade)</li>
    <li>Histórico de solicitações de RH (reembolsos, férias, uniformes)</li>
    <li>Mensagens enviadas no canal "Fale com a Diretoria" e anexos enviados no app</li>
  </ul>

  <h2>O que pode ser mantido</h2>
  <p>Registros que a American Fuel precisa manter por obrigação legal, trabalhista ou fiscal (por exemplo, histórico funcional exigido por lei) podem ser retidos mesmo após a exclusão da conta, pelo período exigido pela legislação aplicável.</p>

  <h2>Prazo</h2>
  <p>As solicitações são processadas em até 30 dias após a confirmação do vínculo do solicitante com a conta.</p>
</body>
</html>`);
});

// Página de suporte do app AF360, usada como "URL de suporte" na App Store
// Connect e Google Play.
app.get('/suporte', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Suporte - AF360</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.6; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    p { font-size: 15px; }
  </style>
</head>
<body>
  <h1>Suporte do AF360</h1>
  <p>O AF360 é o aplicativo corporativo interno da American Fuel.</p>
  <p>Em caso de dúvidas, problemas técnicos ou solicitações relacionadas ao app, entre em contato pelo e-mail: <a href="mailto:rayanne.ernandez@globaltera.com.br">rayanne.ernandez@globaltera.com.br</a></p>
</body>
</html>`);
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
