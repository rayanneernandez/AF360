/**
 * Middleware simples de autenticação por API key.
 * O app envia o header "x-api-key" e comparamos com process.env.API_KEY.
 * Não é uma autenticação de usuário — apenas garante que só o app
 * (que conhece a chave) consegue chamar a API.
 */
function requireApiKey(req, res, next) {
  const expected = process.env.API_KEY;

  // Se ninguém configurou API_KEY ainda, não bloqueia (facilita o setup
  // inicial local), mas avisa no log — em produção sempre configure.
  if (!expected) {
    console.warn('[auth] API_KEY não configurada — chamadas não estão protegidas.');
    return next();
  }

  const provided = req.header('x-api-key');
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'unauthorized', message: 'x-api-key inválida ou ausente.' });
  }

  return next();
}

module.exports = { requireApiKey };
