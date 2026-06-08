# OrientaHub

OrientaHub e um aplicativo web para organizar orientacoes academicas, acompanhando alunos, trabalhos, prazos, status e comentarios em um unico lugar.

O sistema foi pensado para uso por orientador e alunos, com cadastro de estudantes, registro de trabalhos academicos e acompanhamento do andamento de cada entrega.

## Funcionalidades

- Login para orientador e alunos.
- Cadastro de alunos com categoria e instituicao.
- Registro de trabalhos como projeto, TCC, dissertacao, tese, artigo, relatorio e outros.
- Acompanhamento de status: iniciado, em andamento, revisado, concluido e submetido.
- Controle de datas importantes, como qualificacao, defesa, entregas e submissao de artigo.
- Comentarios entre orientador e aluno em cada trabalho.
- Upload/anexo de arquivos pelo aluno.
- Painel do orientador com filtros por aluno, tipo e status.
- Lista de prazos criticos.
- Historico de trabalhos concluidos.
- Recuperacao de senha por e-mail usando Supabase Edge Function.

## Tecnologias

- HTML
- CSS
- JavaScript
- Supabase
- GitHub Pages

## Como abrir

Este projeto deve ser aberto pelo link publicado no GitHub Pages ou por um servidor local.

Abrir o arquivo `index.html` diretamente no computador pode nao funcionar corretamente, porque o aplicativo usa banco de dados online.

## Configuracao do banco de dados

O projeto usa Supabase para salvar os dados do aplicativo.

Para preparar o banco:

1. Abra o Supabase.
2. Acesse o SQL Editor.
3. Rode o conteudo do arquivo `supabase_setup.sql`.
4. Confira se a tabela `app_state` foi criada.

## Recuperacao de senha

A recuperacao de senha usa uma funcao do Supabase integrada ao Resend.

As instrucoes estao no arquivo:

`SUPABASE_EMAIL_SETUP.md`

## Arquivos principais

- `index.html`: estrutura principal da pagina.
- `styles.css`: estilos visuais do aplicativo.
- `app.js`: logica do sistema, telas, cadastro, login, trabalhos, comentarios e integracao com Supabase.
- `supabase_setup.sql`: criacao da tabela usada pelo app.
- `send-reset-email.ts`: funcao para envio de e-mail de redefinicao de senha.
- `gisprad-logo.jpeg`: imagem usada na tela de login.

## Acesso inicial

O acesso inicial do orientador esta configurado no aplicativo para testes.

- Usuario: `orientador`
- Senha: `1234`

Depois de publicar, recomenda-se trocar esses dados no codigo antes de usar com dados reais.

## Observacao

Este repositorio corresponde ao projeto OrientaHub. Arquivos de outros projetos nao fazem parte deste aplicativo.
