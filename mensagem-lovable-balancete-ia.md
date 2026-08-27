# Mensagem para a Lovable

Oi! Encontrei dois problemas onde o app mobile recebe dados diferentes/incompletos do que o painel web, aparentemente no mesmo endpoint (`/api/public/internal/financeiro`, acessado pelo app via proxy `/api/financeiro`):

## 1. Balancete/DRE (`recurso=balancete`)

No web, com filtro "Mês" (agosto/2026, todos os postos), os dados aparecem certos. No app, com os MESMOS parâmetros (ano=2026, mesIni=8, mesFim=8, sem unidadeIds), a API retorna erro/sem dados — a mensagem que já apareceu foi "Não foi possível consultar a API do balancete".

Isso bateu com o timeout de 53 postos numa chamada só que vocês corrigiram recentemente (consulta paralela, 6 por vez).

Pergunta: esse conserto foi aplicado na rota que o app usa (`/api/public/internal/financeiro?recurso=balancete`), ou só na rota interna que o painel web usa?

## 2. Inteligência IA (`recurso=ia-predicoes`)

No app, os campos `fornecedor_nome`, `valor_esperado` e `ocorrencias` de cada previsão vêm vazios/zerados. Os outros campos do mesmo item (`posto`, `tipo`, `competencia`, `periodicidade`, `confianca`, `mensagem`, `detalhe`) vêm certos — inclusive a `mensagem` já traz o valor certo embutido no texto (ex: "NATURGY, no PETROMASA IRAJA.: pagamento mensal esperado de R$ 597.643,78").

Isso indica que esses 3 campos específicos não estão sendo preenchidos na resposta que o app recebe.

Podem confirmar os nomes exatos desses campos no JSON de resposta desse recurso?

## 3. Projeções (`recurso=projecoes`)

O "Saldo bancário atual" (saldoInicial) bate certinho entre app e web. Mas o mês final do período (ex: jan/27, no horizonte de 6 meses) vem com um saldo projetado bem diferente entre os dois — no app deu -R$3.602.432.001,76, no web deu R$3.486.041.432,82 (diferença de ~R$116 milhões). Como o ponto de partida é igual, a diferença está em algum dos meses intermediários (provavelmente na média de pagamentos, que é o valor de maior magnitude).

Isso pode ser só reflexo de ser uma API "ao vivo" que recalcula a cada chamada (e os dois lados consultaram em momentos diferentes) — mas se não for esse o motivo, vale confirmar se a agregação de postos é sempre a mesma entre as duas rotas.
