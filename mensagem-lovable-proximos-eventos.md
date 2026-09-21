# Mensagem para a Lovable

Oi! Reparei que o portal web de vocês também mostra um "Próximos eventos" (igual ao card que a gente tem no app mobile, na tela inicial do colaborador).

Vocês já confirmaram antes que não existe tela de cadastro de evento em lugar nenhum, e que por isso a tabela `rh_calendario_eventos` só tem 1 evento cadastrado.

**Minha dúvida é: de onde o "Próximos eventos" de vocês, no portal web, puxa os dados dele?**

- É a mesma tabela `rh_calendario_eventos` que o app mobile já usa (via `/api/public/internal/rh-calendario`)?
- Ou é outra fonte — outra tabela, algo fixo/hardcoded, ou alguma integração externa (tipo Google Agenda)?

Pergunto porque, se for outra fonte diferente da que o app usa, os "próximos eventos" que aparecem pra vocês no portal e os que aparecem pro colaborador no app podem estar mostrando coisas diferentes sem a gente perceber — quero ter certeza que os dois lados estão lendo do mesmo lugar.
