# AF 360 — API Interna (`/api/public/internal/*`)

Documentação oficial enviada pelo time do Lovable em 16/07/2026. Guardada aqui
para consulta rápida ao mexer em `lovable.js` e nas rotas que dependem dele —
evita ficar redescobrindo nome de tabela/coluna por tentativa e erro.

---

## 1. Autenticação e URL

- **URL de produção (estável, imutável mesmo se renomearem o projeto):**
  `https://project--f9a2d9ec-6a30-46c7-8ddd-b5e275064f7b.lovable.app`
- **URL de preview (última build de preview):**
  `https://project--f9a2d9ec-6a30-46c7-8ddd-b5e275064f7b-dev.lovable.app`
- **NÃO use** `https://af-360-hub.lovable.app` nem `https://americanfuel.com.br`
  para essas rotas — o domínio custom faz redirect e quebra o header.

Header obrigatório em toda chamada:

```
x-internal-secret: <valor de INTERNAL_API_SECRET>
```

Sem esse header (ou com valor errado) → `401 Unauthorized`.
Content-Type de resposta: `application/json`.

## 2. Limites, paginação e fuso

- `limit` default = **200**, máx = **2000**.
- `offset` default = **0**.
- `count=1` habilita `count: exact` (mais caro, use só quando precisa do total).
- Ordenação: `order=<coluna>:asc|desc` (default `asc`).
- **Fuso horário:** todos os `timestamptz` são armazenados em UTC. Converta
  para `America/Sao_Paulo` (UTC−3) no cliente. Colunas `date` são date-only
  (sem TZ) — trate como data local BR, nunca `new Date(iso)` direto.

---

## 3. Endpoints

### 3.1 `GET /api/public/internal/table` — leitura genérica

Query params:

| Param | Tipo | Descrição |
|---|---|---|
| `name` | string, **obrigatório** | Nome da tabela (deve estar na allowlist §4) |
| `select` | string | Colunas, formato PostgREST. Default `*` |
| `limit` | int | 1..2000, default 200 |
| `offset` | int | default 0 |
| `order` | string | `coluna:asc` ou `coluna:desc` |
| `count` | `1` | Retorna `count` exato no body |
| `<col>__<op>` | any | Filtro. Operadores: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `in` (csv), `is` (`null`/`true`/`false`), `not` (só `is null`) |
| `<col>` (sem `__`) | any | Atalho para `eq` |

**Resposta 200:**
```json
{ "data": [ /* linhas */ ], "count": 1234 | null, "limit": 200, "offset": 0 }
```

**Erros:**
- `400 { "error": "table not allowed", "table": "...", "allowed": [...] }`
- `400 { "error": "<mensagem postgrest>", "details": {...} }`
- `401 Unauthorized`

**Exemplos:**
```
GET /api/public/internal/table?name=dir_contatos&chat_status__eq=fila&order=last_inbound_at:desc&limit=50
GET /api/public/internal/table?name=rh_colaboradores&status__in=ativo,ferias&select=id,nome_completo,cargo,status&count=1
GET /api/public/internal/table?name=dir_mensagens&phone__eq=5521999999999&order=created_at:asc&limit=500
```

### 3.2 `PATCH /api/public/internal/dir-contato` — atualizar contato

Query: `phone=<E.164 sem +>` (obrigatório).

Body JSON:
```json
{
  "chat_status": "fila" | "ativo" | "finalizado",   // opcional
  "metadata": { /* objeto qualquer, merge raso sobre o atual */ }
}
```

Retorna `{ "data": <linha atualizada> }`. Erros `400`/`401` com `{ "error": "..." }`.

### 3.3 `GET /api/public/internal/rh-stats` — contagem de colaboradores

Retorna:
```json
{ "total": 217, "by_status": { "ativo": 180, "ferias": 12, "afastado": 5, "..." : 20 } }
```

Pagina internamente em 1000 linhas (cap defensivo de 20k).

---

## 4. Allowlist de tabelas + colunas

Todas as colunas abaixo estão disponíveis em `select`. Tipos vêm do
`information_schema`; `USER-DEFINED` são enums do Postgres — o valor volta
como string.

### Fale com a Diretoria

**`dir_contatos`** — 1 linha por número de WhatsApp
- `id: uuid`, `phone: text` (E.164 sem `+`), `display_name: text`, `avatar_url: text`
- `chat_status: enum` (`fila` | `ativo` | `finalizado`)
- `blocked: bool`, `muted: bool`
- `last_inbound_at: timestamptz`, `last_outbound_at: timestamptz`
- `metadata: jsonb`, `created_at`, `updated_at`

**`dir_mensagens`**
- `id: uuid`, `phone: text`, `direction: enum` (`in`/`out`)
- `message: text`, `message_type: enum`, `media_url: text`, `media_mime: text`, `file_name: text`
- `status: enum`, `sender_name: text`, `created_by: uuid`
- `metadata: jsonb`, `created_at`, `updated_at`

**`dir_read_cursors`**
- `id: uuid`, `user_id: uuid`, `phone: text`, `last_read_at: timestamptz`, `created_at`, `updated_at`

### RH

**`rh_colaboradores`** (principal — 87 colunas)
- `id, profile_id, empresa_id, matricula, nome_completo, nome_social, cpf, rg, data_nascimento, sexo, estado_civil, nacionalidade, naturalidade`
- `email_pessoal, email_corporativo, email_corporativo_secundario, telefone, whatsapp, celular, celular_whatsapp`
- Endereço: `endereco_cep, endereco_logradouro, endereco_numero, endereco_complemento, endereco_bairro, endereco_cidade, endereco_estado`
- `nome_mae, nome_pai, cargo, setor, posto_trabalho, gestor_id, gestor_direto_id, gestor_geral_id`
- `tipo_contrato, data_admissao, data_demissao, status` (enum: `ativo`/`ferias`/`afastado`/`inativo`/…)
- `salario_base, banco, agencia, conta, tipo_conta, pix, pix_tipo`
- `tamanho_camisa, tamanho_calca, tamanho_calcado, foto_url, observacoes`
- `regime_jornada, jornada_id, horario_trabalho, dependentes_irrf, grau_insalubridade, tem_periculosidade, usa_vt, valor_vr_mensal`
- `pis_pasep, tipo_sanguineo, contato_emergencia_nome, contato_emergencia_telefone`
- `grau_instrucao, carteira_habilitacao, carteira_trabalho, orgao_rg, uf_rg, cidade_nascimento, uf_nascimento, pais_nascimento`
- `vencimento_experiencia, codigo_interno, motivo_desligamento, valor_rescisao_liquida`
- `portal_status, portal_ativado_em, email_provedor, email_provedor_secundario`
- `inativado_em, inativado_por, motivo_inativacao_tipo, motivo_inativacao`
- `colab_tour_concluido_em, created_at, updated_at, created_by`

**`rh_documentos`** — `id, colaborador_id, tipo, nome_arquivo, storage_path, validade, data_validade, data_emissao, observacoes, tamanho_bytes, mime_type, status, uploaded_by, created_at, updated_at, created_by`

**`rh_contracheques`** — `id, colaborador_id, competencia (date), valor_bruto, valor_liquido, valor_descontos, arquivo_url, observacoes, created_at, updated_at, created_by`

**`rh_treinamentos`** — `id, titulo, descricao, carga_horaria_min, obrigatorio, conteudo_url, tipo, video_url, created_at, updated_at, created_by`

**`rh_treinamento_inscricoes`** — `id, treinamento_id, colaborador_id, status, iniciado_em, concluido_em, nota, certificado_url, tempo_gasto_min, tentativas, created_at, updated_at, created_by`

**`rh_premiacoes`** — `id, colaborador_id, tipo_id, competencia, data_pagamento, valor, motivo, meta_descricao, status, pago_em_folha, observacoes, created_at, updated_at, created_by`

**`rh_premiacao_tipos`** — `id, nome, descricao, ativo, created_at, updated_at, created_by`

**`rh_transferencias`** — `id, colaborador_id, data_vigencia, empresa_origem_id, setor_origem, cargo_origem, salario_anterior, gestor_direto_anterior_id, empresa_destino_id, setor_destino, cargo_destino, salario_novo, gestor_direto_novo_id, motivo, observacao, status, rateio_folha, aprovado_por, aprovado_em, efetivado_por, efetivado_em, motivo_rejeicao, created_at, updated_at, created_by`

**`rh_ferias`** — `id, colaborador_id, data_inicio, data_fim, dias_planejados, status, observacoes, created_at, updated_at, created_by`

**`rh_cargos`** — `id, nome, descricao, ativo, created_at, updated_at, created_by`

**`rh_setores`** — `id, nome, descricao, ativo, created_at, updated_at, created_by`

**`rh_dependentes`** — `id, colaborador_id, nome, parentesco, grau_parentesco, data_nascimento, cpf, e_dependente_ir, estudante_universitario, incapacitado, ativo, observacao, created_at, updated_at, created_by`

**`rh_beneficios`** — `id, nome, descricao, tipo, ativo, created_at, updated_at, created_by`

**`rh_beneficios_colaborador`** — `id, colaborador_id, vr_ativo, vr_valor_dia, va_ativo, va_valor_dia, seguro_vida_ativo, seguro_vida_seguradora, seguro_vida_cobertura, seguro_vida_desconto_mensal, plano_saude_ativo, plano_saude_operadora, plano_saude_plano, plano_saude_desconto_titular, plano_saude_desconto_dependente, plano_odonto_ativo, plano_odonto_operadora, plano_odonto_plano, plano_odonto_desconto_titular, plano_odonto_desconto_dependente, created_at, updated_at, created_by, updated_by`

**`rh_salario_historico`** — `id, colaborador_id, vigencia_inicio, salario_anterior, salario_novo, percentual_reajuste, motivo, observacao, created_by, created_at, updated_at`

**`rh_hierarquia_historico`** — `id, tipo_evento, posto_id, colaborador_id, tipo_lideranca, posto_anterior_id, motivo, dados_anteriores (jsonb), dados_novos (jsonb), registrado_por, created_at`

**`rh_historico_contratacoes`** — `id, colaborador_id, cpf, empresa_id, cargo, data_admissao, data_demissao, motivo_desligamento, valor_rescisao_liquida, observacoes, created_at, updated_at, created_by`

**`rh_folha`** — `id, competencia_id, colaborador_id, salario_base, total_proventos, total_descontos, base_inss, base_irrf, base_fgts, valor_inss, valor_irrf, valor_fgts, liquido, calculado_em, status, dias_trabalhados, valor_vt, valor_vr, valor_adiantamento, outros_proventos, outros_descontos, dependentes_irrf_snapshot, observacao, status_envio, data_envio, data_recebimento, assinatura_base64, ip_assinatura, created_by, created_at, updated_at`

**`rh_folha_competencias`** — `id, ano, mes, status, data_pagamento, data_prevista_pagamento, observacao, fechada_em, fechada_por, total_colaboradores, total_bruto, total_liquido, total_fgts, created_by, created_at, updated_at`

**`rh_folha_lancamentos`** — `id, folha_id, rubrica_id, referencia, quantidade, valor, origem, observacao, created_by, created_at, updated_at`

### Globais

**`empresas`** — `id, razao_social, nome_fantasia, apelido, cnpj, tipo (enum), bandeira (enum), telefone, email, is_active, endereco_texto, rua, numero, bairro, cep, cidade, estado, regiao, idq, cd_rede, proprietario, contabilidade_id, servicos (jsonb), ipiranga_habilitado, vendida, data_venda, comprador, venda_observacao, data_cadastro, data_primeira_venda, created_at, updated_at`

**`profiles`** — `id (=auth.users.id), full_name, email, email_secundario, avatar_url, is_master, is_active, empresa_id, role_id, must_change_password, chat_atendente, created_at, updated_at`

---

## 5. Publicação

**Sim, `/api/public/internal/*` precisa de um publish.** Rotas TanStack são
compiladas no bundle do worker; enquanto não publica, produção
(`project--<id>.lovable.app`) retorna o HTML antigo → 404.

O deploy é normal — só recompila e sobe o worker. **Não altera nada
funcional** do painel "Fale com a Diretoria" nem do RH; as rotas novas são
puramente aditivas (arquivos novos em `src/routes/api/public/internal/`).
Nenhuma migration de banco foi disparada.

Depois de publicar, teste rápido:

```bash
curl -s -H "x-internal-secret: $SECRET" \
  "https://project--f9a2d9ec-6a30-46c7-8ddd-b5e275064f7b.lovable.app/api/public/internal/rh-stats"
```

Deve retornar `{ "total": ..., "by_status": {...} }`.
