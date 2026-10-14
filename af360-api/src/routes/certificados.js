const express = require('express');
const { postCertificado } = require('../lovable');

const router = express.Router();

// Certificado Digital (painel Administrativo) — recursos internos criados pela
// Lovable em 14/10/2026. Cada ação é um POST com colaborador_id no corpo; o
// app manda os campos com os mesmos nomes da Lovable (lista: busca, tipo,
// status, so_vencendo, offset, limite; detalhe/download/status: id; upload:
// tipo_titular, posto_id|titular_id, pfx_base64, senha; contatos: acao...).
const ACOES = {
  lista: 'cert-lista',
  detalhe: 'cert-detalhe',
  download: 'cert-download',
  status: 'cert-status',
  upload: 'cert-upload',
  opcoes: 'cert-opcoes',
  contatos: 'cert-contatos',
  permissao: 'cert-permissao',
};

// Os erros de negócio da Lovable vêm no corpo (ex.: senha_incorreta,
// arquivo_invalido, sem_permissao_senha) — repassa o código pro app.
function lovableErrorCode(err) {
  try {
    const body = JSON.parse(err.lovableBody || '{}');
    return body.erro || body.error || null;
  } catch {
    return null;
  }
}

// POST /api/certificados/:acao  { colaboradorId, ...campos }
router.post('/:acao', async (req, res) => {
  const recurso = ACOES[req.params.acao];
  if (!recurso) return res.status(404).json({ ok: false, error: 'acao_invalida' });
  const { colaboradorId, ...campos } = req.body ?? {};
  if (!colaboradorId) return res.status(400).json({ ok: false, error: 'missing_colaboradorId' });
  try {
    const json = await postCertificado(recurso, { colaborador_id: colaboradorId, ...campos });
    // A Lovable pode devolver { erro } com status 200 nas falhas de negócio.
    if (json && json.ok === false) {
      return res.status(400).json({ ok: false, error: json.erro || json.error || 'falha', message: json.mensagem || json.message });
    }
    res.json({ ok: true, data: json ?? {} });
  } catch (err) {
    // Não loga o corpo: upload/download carregam arquivo e senha do certificado.
    console.error(`[certificados/${req.params.acao}] erro:`, err.message);
    const code = lovableErrorCode(err);
    const status = err.lovableStatus && err.lovableStatus >= 400 && err.lovableStatus < 500 ? 400 : 500;
    res.status(status).json({ ok: false, error: code || (status === 400 ? 'request_invalida' : 'query_failed'), message: err.message });
  }
});

module.exports = router;
