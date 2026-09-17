# Mensagem para a Lovable

Oi! O João pediu pra incluir no app: quando o administrador cria um usuário novo com senha temporária (tela Usuários > Novo Usuário), o colaborador precisa ser obrigado a trocar essa senha no primeiro acesso, antes de entrar em qualquer painel.

Já implementei a parte de troca de senha inteiramente do nosso lado (app + af360-api), sem precisar de coluna nova nenhuma na tabela `profiles` nem de endpoint novo de vocês — uso direto o Supabase Auth (`PUT /auth/v1/user` com o token da própria sessão) pra trocar a senha e marcar que não precisa mais trocar.

**A única coisa que preciso que vocês façam:** quando o "Novo Usuário" for criado com uma senha temporária (esse fluxo que já existe na tela), marcar esse usuário no Supabase Auth com:

```json
{
  "user_metadata": {
    "must_change_password": true
  }
}
```

Isso dá pra fazer tanto na criação do usuário (`supabase.auth.admin.createUser({ ..., user_metadata: { must_change_password: true } })`) quanto, se preferirem, num "resetar senha" que gere uma nova temporária pra alguém que já existe.

O app já sabe ler essa flag sozinho: o login (`POST /api/auth/login`) devolve `mustChangePassword` a partir desse `user_metadata`, e quando vem `true` o app força a tela de troca de senha antes de liberar o painel — e já limpa a flag (`must_change_password: false`) assim que a pessoa troca com sucesso. Vocês não precisam mexer em mais nada além de setar essa flag na criação.

Só pra eu confirmar: hoje o "Novo Usuário" cria o login via Admin API do Supabase (`auth.admin.createUser`) ou por algum outro caminho? Preciso saber se dá pra vocês simplesmente incluírem esse `user_metadata` na mesma chamada que já existe, ou se é outro fluxo.
