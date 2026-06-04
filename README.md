# Lojinha da Jô

Aplicativo simples para controlar uma lojinha familiar pelo navegador do computador ou celular.

## O que o app faz

- Cadastra produtos com preço pago, preço de venda e estoque.
- Calcula lucro por unidade automaticamente.
- Registra vendas e baixa o estoque.
- Separa venda paga de venda que a pessoa vai pagar depois.
- Guarda cliente, data da venda e data combinada para pagamento.
- Mostra valores a receber e permite marcar como recebido.
- Mostra resumo do dia, resumo do mês, lucro, estoque investido e produtos acabando.
- Exporta vendas em CSV e exporta/importa backup em JSON.

## Como abrir no computador

Abra o arquivo `index.html` com dois cliques.

Os dados ficam salvos no próprio navegador usado para abrir o app. Para não perder dados, use o botão `Baixar backup` de vez em quando.

## Como usar no celular

Depois de publicar no GitHub Pages, abra o link no navegador do celular. Em muitos celulares aparece a opção de instalar ou adicionar à tela inicial.

## Como subir no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos os arquivos desta pasta para o repositório.
3. No GitHub, abra `Settings` > `Pages`.
4. Em `Build and deployment`, escolha `Deploy from a branch`.
5. Escolha a branch `main` e a pasta `/root`.
6. Salve e aguarde o link ficar pronto.

## Observação importante

Esta primeira versão salva os dados no aparelho/navegador. Se abrir em outro celular, os dados não aparecem automaticamente. Para levar os dados para outro aparelho, use `Baixar backup` e depois `Importar backup`.
## Sincronização com Supabase

O app já está preparado para sincronizar em nuvem pelo Supabase, mas precisa das chaves do seu projeto.

1. Crie um projeto gratuito no Supabase.
2. Em `Authentication > Users`, crie um usuário para a Joelma com o e-mail configurado em `supabase-config.js` e a senha `22111996`.
3. Em `SQL Editor`, rode o arquivo `supabase-setup.sql`.
4. Habilite Realtime para a tabela `lojinha_state` no painel do Supabase.
5. Em `Project Settings > API`, copie a Project URL e a chave anon/public.
6. Preencha `url` e `anonKey` no arquivo `supabase-config.js`.
7. Publique no GitHub Pages e abra o mesmo link nos dois computadores.

Quando a sincronização estiver funcionando, o topo do app mostra `Sincronizado`.

## Cuidados para nao perder dados

- Use o app pelo link publicado, nao abrindo `index.html` direto, quando quiser sincronizar entre celular e computador.
- Antes de fechar o app, confira se o topo mostra `Sincronizado`.
- Se aparecer erro, modo local ou sem internet, clique em `Baixar backup agora` antes de continuar em outro aparelho.
- Evite editar ao mesmo tempo em dois aparelhos. O app protege contra sobrescrever dados mais novos, mas o uso mais seguro e terminar uma edicao, aguardar sincronizar e so depois abrir no outro aparelho.
- O projeto nao usa geracao de imagem da OpenAI. As instrucoes locais em `AGENTS.md` tambem bloqueiam `gpt-image-2`, `image_generation`, `images.generate` e ferramentas de imagem em futuras tarefas.

