# Mensagem para a Lovable — Módulo "Administrativo" (Operação) no app mobile

Oi! Vamos trazer o painel "Administrativo" (que já existe no web, seção "OPERAÇÃO") pra o app mobile — mesmo padrão de proxy que já usamos no Financeiro e no Gestão. **Atenção**: esse é um painel **diferente** do "Administrador" que já existe no app (gestão da plataforma — usuários, acessos, sistema). Este novo é sobre a operação física dos postos: alvarás, manutenção, almoxarifado e frota.

O painel web tem essas telas:

## 1. Dashboard Administrativo
KPIs: "Alvarás a vencer (30 dias)" (com sub-info "X já vencido(s)"), "Chamados de manutenção abertos" (sub-info "de Y chamados registrados"), "Itens com estoque crítico" (sub-info "de Y itens no almoxarifado"), "Veículos em oficina" (sub-info "de Y veículos da frota"). Filtro de período (Mês/Ano, com navegação de mês) + seletor de posto ("Rede toda" ou posto específico). Gráfico de rosca "Status dos chamados de manutenção" (categorias: Aberto, Em andamento, Aguardando peça, Concluído). Card "Licenças próximas do vencimento" — tabela com Documento, Posto, Vencimento, Status (Vencido/Regular). Card "Últimos pedidos de insumos pendentes" (vazio no seu print — "Nenhum pedido pendente no período").

**Pergunta:** qual `recurso`/endpoint retorna esses dados consolidados? Os mesmos filtros de posto/período do Financeiro e do Gestão (dataInicial/dataFinal, postoIds) se aplicam aqui também?

## 2. Alvarás e Licenças
Lista de documentos: Documento (nome + número, ex: "Licença Ambiental" / "nº LO-2024-7712"), Posto, Órgão (ex: INEA, ANP, Corpo de Bombeiros, Vigilância Sanitária, Prefeitura), Vencimento (com "X dia(s) em atraso" ou "faltam X dia(s)"), Status (Vencido/Regular). Busca por documento/órgão/posto. Filtro "Todos os status". Botão "Nova licença" (CRUD).

**Pergunta:** nome do recurso, campos exatos do cadastro (pra criar/editar uma licença: quais campos são obrigatórios?), e se o cálculo de "vencido/regular" e "dias em atraso/faltam" vem pronto do backend ou precisa ser calculado no cliente a partir da data de vencimento.

## 3. Manutenções (Chamados)
Lista: Protocolo (ex: "CH-2026-0001" + timestamp de abertura), Posto, Descrição do problema (título + local/detalhe, ex: "Bomba 3 travando no bico de gasolina" / "Pista · Bomba 3 · Bico apresenta travamento interm..."), Prioridade (Alta/Média/Baixa), Status (dropdown editável: Aberto/Em andamento/Aguardando peça/Concluído). Busca por protocolo/problema/posto. Filtros de status e prioridade. Botão "Abrir chamado" (criar novo).

**Pergunta:** nome do recurso, campos do formulário de abertura de chamado, e o endpoint de atualização de status (é PATCH direto no chamado?).

## 4. Almoxarifado
Lista: Nome do item, Categoria (Copa/Limpeza/Peças/Escritório), Quantidade em estoque (com unidade: pct, gl, un, cx), Status (Normal/Atenção/Zerado). Busca por item. Filtro de categoria. Botão "Solicitar Suprimento".

**Pergunta:** nome do recurso, e como o Status (Normal/Atenção/Zerado) é definido — é uma regra de estoque mínimo configurada por item, ou vem calculado do backend?

## 5. Frota
Lista: Veículo/Modelo (+ ano), Placa, Posto alocado (ou "Escritório/Rede"), Quilometragem, Status (Ativo/Em oficina), menu de ações ("..."). Busca por veículo/placa. Seletor "Rede toda"/posto.

**Pergunta:** nome do recurso, e quais ações existem no menu "..." de cada veículo (editar, registrar manutenção, etc.)?

## 6. Notificações
Mesma estrutura genérica de Rotinas/Templates que já usamos no Financeiro (`modulo=fin`) e no Gestão (`modulo=gst`). No seu print já existe 1 template padrão do sistema: "Documento vencendo" (`adm_documento_vencendo`, variáveis `documento`/`dias`/`vencimento`).

**Pergunta:** esse template já usa `modulo=adm`? Se sim, esse `adm` é o mesmo módulo do painel "Administrador" que já existe no app, ou é um módulo separado pra esse "Administrativo" novo? Precisamos ter certeza pra não misturar notificações dos dois painéis.

---

**Resumo do que precisamos:**
- Nome exato do `recurso`/endpoint pra cada tela (dashboard, alvarás, manutenções, almoxarifado, frota).
- Parâmetros de filtro aceitos (período, posto).
- Formato exato da resposta JSON de cada um.
- Confirmação do `modulo` correto pra notificações (evitar conflito com o painel "Administrador" já existente).

Assim que confirmarem, a gente cria a rota proxy em `af360-api` e as telas no app.
