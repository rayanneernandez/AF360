# af360-api

API intermediária entre o app AF360 (React Native) e o banco Postgres
self-hosted da empresa. O app nunca se conecta direto no Postgres — ele
chama esta API, que é quem fala com o banco usando o usuário somente
leitura `lovable_ro`.

```
app (React Native) --HTTPS--> af360-api (Vercel) --Postgres (5432)--> VPS 2.24.77.227
```

## Rodando localmente

```bash
cd af360-api
npm install
cp .env.example .env   # edite se precisar
npm run dev
```

Teste:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/health/db     # testa a conexão real com o Postgres
curl -H "x-api-key: SUA_CHAVE" http://localhost:3000/api/rh/colaboradores
```

## Endpoints

Sem API key (para diagnóstico de deploy):

- `GET /api/health` — só confirma que a API está no ar.
- `GET /api/health/db` — faz uma query real (`select now()`) para testar a conexão com o Postgres. **Este é o endpoint para confirmar se o firewall da VPS libera o Vercel.**

Com API key (header `x-api-key`):

- `GET /api/empresas` — lista de empresas.
- `GET /api/empresas/postos` — lista de postos/unidades.
- `GET /api/rh/cargos` — lista de cargos.
- `GET /api/rh/setores` — lista de setores.
- `GET /api/rh/colaboradores` — lista colaboradores. Filtros por query string: `status`, `empresa_id`, `posto_id`, `setor_id`, `cargo_id`, `q` (busca por nome/cpf), `limit`, `offset`.
- `GET /api/rh/colaboradores/stats` — contagem de colaboradores por status (para os pills Quadro/Ativos/Afastados/Férias/Desligados).
- `GET /api/rh/colaboradores/:id` — dados completos de um colaborador.
- `GET /api/rh/colaboradores/:id/documentos`
- `GET /api/rh/colaboradores/:id/contracheques`
- `GET /api/rh/colaboradores/:id/treinamentos`
- `GET /api/rh/colaboradores/:id/promocoes`
- `GET /api/rh/colaboradores/:id/premiacoes`
- `GET /api/rh/colaboradores/:id/transferencias`
- `GET /api/rh/colaboradores/:id/afastamentos`
- `GET /api/rh/colaboradores/:id/ferias`

Todas as respostas seguem o formato `{ ok: true, data: ... }` ou
`{ ok: false, error: ..., message: ... }`.

> **Nota:** os nomes de tabela usados nas queries (`rh_colaboradores`,
> `rh_salario_historico`, `rh_premiacoes`, etc.) foram inferidos da
> convenção de nomenclatura do schema (`SCHEMA_DUMP.md`). Se algum nome
> de tabela ou coluna estiver diferente do real, o endpoint correspondente
> vai retornar erro 500 com a mensagem do Postgres — é só ajustar a query
> no arquivo de rota correspondente em `src/routes/`.

## Deploy no Vercel

1. Suba esta pasta (`af360-api`) para um repositório Git (GitHub/GitLab).
2. No Vercel: **New Project** → importe o repositório.
3. Em **Project Settings → Environment Variables**, cadastre todas as
   variáveis do `.env.example` (com os valores reais — `PGPASSWORD`,
   `API_KEY`, etc.).
4. Deploy. O Vercel vai detectar `vercel.json` e servir tudo via
   `api/index.js`.
5. Teste imediatamente: `https://SEU-PROJETO.vercel.app/api/health/db`

## Ponto de atenção: firewall da VPS

O Postgres está em `2.24.77.227:5432` numa VPS. Não é garantido que a
porta 5432 aceite conexões vindas dos IPs de saída do Vercel (que não
são fixos). Isso só se confirma testando `GET /api/health/db` **depois
do deploy**.

- Se der `ok: true` → está tudo certo, pode seguir usando normalmente.
- Se der erro (`db_unreachable`, timeout, `ECONNREFUSED`) → o firewall da
  VPS provavelmente está bloqueando o Vercel. Nesse caso, é preciso pedir
  para o João Rangel/João Guilherme liberar a porta 5432 para os ranges
  de IP do Vercel (ou considerar uma alternativa, como hospedar a API na
  própria VPS/rede interna).

## Segurança

- O usuário do Postgres (`lovable_ro`) é somente leitura — a API não
  escreve nada no banco por enquanto (só endpoints `GET`).
- O `API_KEY` protege a API de acesso não autenticado; sem ele, qualquer
  pessoa que descubra a URL do Vercel conseguiria ler dados da empresa.
- Nunca commitar o arquivo `.env` real nem hardcodar a senha do Postgres
  no código do app React Native.
