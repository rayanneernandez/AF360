Oi! Estou terminando de replicar o módulo de Recrutamento (R&S) no app mobile e fiquei travada em 7 pontos porque não encontrei os endpoints/campos correspondentes na API que já uso (`/api/public/internal/recrutamento`). Preciso confirmar cada um antes de ligar de verdade no app, pra não inventar dado ou endpoint errado. Pode me ajudar?

## 1. Roteiro de triagem (perguntas por WhatsApp)

No painel web, dentro de uma vaga → Candidatos/Triagem → "Editar roteiro", aparece o roteiro completo (mensagem de boas-vindas, perguntas numeradas com opções, mensagem de encerramento, toggle "Automação ativa").

- Testei o campo `vaga.triagem_perguntas` (que a própria vaga retorna) em duas vagas diferentes, incluindo uma que o painel mostra com 7 perguntas configuradas — nas duas veio `[]` (vazio). Então esse roteiro não está sendo lido dali.
- Tentei adicionar um GET simétrico ao `PATCH /api/public/internal/recrutamento?recurso=triagem-vaga` (que já uso pra salvar), mas o GET voltou `"recurso desconhecido: triagem-vaga"`.

**Pergunta**: qual é o endpoint/recurso certo pra LER o roteiro de triagem de uma vaga (perguntas + opções + mensagens)? E qual o formato de cada pergunta — é `{texto, opcoes}`, `{pergunta, respostas}` ou outro nome de campo?

## 2. Calcular match (por candidato, dentro de uma vaga)

No dropdown "..." de cada candidato (aba Candidatos/Triagem de uma vaga), existe a ação "Calcular match". Hoje só encontrei o endpoint de sugestão por IA (`POST /sugestao-ia`), que recalcula a vaga inteira, não um candidato específico.

**Pergunta**: existe um endpoint específico pra recalcular o match de UM candidato numa vaga? Se sim, qual?

## 3. Enviar prova / DISC

Mesmo dropdown do item 2, ação "Enviar prova / DISC". Não encontrei nenhum endpoint de disparo de avaliação/teste pra um candidato específico (só os de configuração de avaliações/questões, que são os modelos, não o envio).

**Pergunta**: existe endpoint pra enviar uma prova/DISC a um candidato? Qual?

## 4. Gerar link por etapa (candidato)

No dropdown "..." da lista geral de Candidatos, existe "Gerar link por etapa". O único "gerar link" que encontrei é o de aprovação de pendência de documento (`aprovarRecrutamentoPendencia`), que é outra coisa.

**Pergunta**: existe endpoint de "gerar link por etapa" pra candidato? Qual e o que ele gera exatamente?

## 5. Anexar currículo a um candidato já existente

Consigo importar currículo pelo endpoint `POST /importar-curriculo` (cria/atualiza candidato a partir da extração da IA), mas não tenho como indicar explicitamente "esse arquivo é do candidato X". Hoje mando o arquivo e só confiro depois se o `candidato_id` retornado bate com o candidato que eu já tinha aberto.

**Pergunta**: existe (ou dá pra criar) um endpoint que receba o `candidato_id` já sabido e o arquivo, e simplesmente anexe/atualize o `curriculo_url` desse candidato direto, sem depender da IA re-identificar quem é?

## 6. Consulta de dados pessoais / antecedentes (CPF)

No painel web, aba "Consulta" do candidato, tem "Atualizar" e "Consultar agora" (busca dados cadastrais pelo CPF e emite certidão de antecedentes da Polícia Federal), e depois aparecem os resultados (Antecedentes criminais — PF, Dados cadastrais (CPF), com nome, nome da mãe, situação cadastral, sexo, data de nascimento).

Testei o candidato "Aleson Felipe dos Santos Chacon" (CA-000024), que o painel mostra com antecedentes e dados cadastrais já consultados — no meu endpoint de detalhe do candidato (`recurso=candidato&id=...`) esses dados não vêm em nenhum campo.

**Pergunta**: qual o endpoint de leitura desses resultados de consulta? E qual o endpoint que dispara o "Consultar agora"?

## 7. Consentimento (termo LGPD aceito)

Mesmo painel do candidato, aba "Consentimento" — mostra "Termo aceito pelo candidato", data/versão do aceite, IP de origem, user-agent, o texto integral do termo e um botão "Baixar comprovante (PDF)".

Testei o mesmo candidato do item 6 (que o painel mostra com termo aceito em 01/09/2026) e também não veio nenhum campo relacionado a consentimento no endpoint de detalhe.

**Pergunta**: qual o endpoint de leitura do consentimento (aceite/data/versão/IP/user-agent/texto)? E existe algum endpoint pra gerar/baixar o comprovante em PDF?

---

Qualquer um desses que você já souber de cabeça já ajuda — não precisa ser tudo de uma vez. Obrigada!
