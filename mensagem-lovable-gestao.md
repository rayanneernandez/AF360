# Mensagem para a Lovable — Módulo "Gestão" no app mobile

Oi! Vamos trazer o painel "Gestão" (que já existe no web) para o app mobile, no mesmo padrão de proxy que usamos no Financeiro (`/api/public/internal/...` por trás de uma rota nova em `af360-api`). Pra isso, precisamos confirmar o contrato de cada aba antes de implementar — sem chutar nomes de campos.

O painel web tem essas abas, cada uma com filtro de período (Dia / Mês / Ano) e seletor de posto (ícone de casinha no topo direito):

## 1. Dashboard (visão geral)
KPIs: Faturamento total, Litros vendidos, GNV vendido. Card "Preço médio por combustível" com uma lista de produtos (ex: Gasolina Aditivada, Gasolina Grid, Gasolina V Power, Gasolina Podium, Gasolina Comum, Etanol Aditivado, Etanol Hidratado, Diesel S10 Aditivado, Diesel S10 Original, Diesel S10 Comum, Diesel S500, Gás Natural Veicular), cada um com: preço/litro, "sem custo"/"custo indisponível", volume (L ou m³) e faturamento. Também tem "Top frentistas — Gasolina aditivada" e "Top frentistas — Lubrificantes" (estavam vazios no seu print — "Sem vendas no período").

**Pergunta:** qual `recurso` (ou endpoint) retorna esses dados? Isso é o mesmo endpoint que já usamos em `diretoriaPainel.js` (`resumo`/`rede`) ou é outro totalmente novo?

## 2. Vendas — Pista
KPIs: Faturamento, Ticket médio, Postos com venda, Cupons. Gráfico "Faturamento diário". Cards "Faturamento por grupo" e "Top vendedores/frentistas". Tabela "Por forma de pagamento" e "Por posto" (colunas: Posto, Cupons, Faturamento).

## 3. Abastecimento
KPIs: Litros vendidos, Faturamento, Preço médio/litro, Postos (consolidado). Gráfico "Volume diário por combustível". Cards "Volume por combustível" e "Volume por turno". Tabela "Ranking por posto" (colunas: Posto, Litros, Faturamento).

## 4. Encerrante
No seu print aparece como "em preparação" — mensagem: "A análise de continuidade de encerrantes (encerrante anterior + litros = encerrante atual) depende da coluna `encerrante` na nova base de abastecimentos, que ainda não está sendo capturada pelo robô em todos os postos." **Pergunta:** isso já foi resolvido, ou essa aba ainda está bloqueada no backend? Se ainda estiver bloqueada, vamos replicar esse mesmo aviso no app em vez de simular dados.

## 5. Vendas — Loja
Mesma estrutura da "Vendas — Pista" (Faturamento, Ticket médio, Postos com venda, Cupons, gráfico de faturamento diário, faturamento por grupo, top vendedores/frentistas, por forma de pagamento, por posto), mas para a loja de conveniência.

## 6. Margem — Loja
Filtro "Margem mínima (%)" (input numérico, default 30) + checkbox "Somente produtos ativos". KPIs: Produtos analisados, Abaixo de X%, Em prejuízo, Margem média. Gráfico "Distribuição por faixa de margem" (barras: Prejuízo <0%, 0-10%, 10-20%, 20-30%, 30-50%, >50%). Tabela "Produtos com margem abaixo de X%" com colunas: Posto, Código produto, Custo, Venda, Lucro unitário, Margem/Markup. Nota na tela: "Margem = (preço venda − custo) ÷ preço venda · cadastro de produto por posto".

## 7. Notificações
Duas sub-abas: "Rotinas" (lista de rotinas cadastradas, botão "Nova rotina") e "Templates" (lista com Nome, Código, Título, Variáveis, Ações). Nos seus prints já tem 2 templates padrão do sistema: "Alerta antifraude" (`gst_antifraude_alerta`, variáveis `posto`/`detalhe`) e "Meta diária do posto" (`gst_meta_diaria`, variáveis `posto`/`realizado`/`meta`/`percentual`). **Pergunta:** isso usa a mesma infraestrutura de notificações que já existe no Financeiro (rotinas/templates), só que com um "código" (namespace `gst_`) diferente? Ou é uma tabela/endpoint separado?

## 8. Configurações
No seu print está com um aviso "Em breve — Este menu está em construção." **Pergunta:** já tem previsão de quando isso deve ficar pronto no web? Vamos deixar essa aba escondida (ou com aviso equivalente) no app até existir.

---

**Resumo do que precisamos pra cada aba (1, 2, 3, 5, 6) que já tem dados reais:**
- Nome exato do `recurso` (ou path do endpoint).
- Parâmetros de filtro aceitos (período: dia/mês/ano + datas; posto/unidade).
- Formato exato da resposta JSON (nomes de campos, tipos, se vem em lista plana ou agrupado).

Assim que confirmarem, a gente cria a rota proxy em `af360-api` e as telas no app, sem inventar nenhum campo.
