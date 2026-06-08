# Envio automático de e-mail (Supabase + Resend)

## 1) Criar conta no Resend
- Acesse https://resend.com
- Crie conta
- Copie sua API Key

## 2) Criar função no Supabase
No terminal com Supabase CLI:

supabase login
supabase link --project-ref wehlukgburcprreixwef
supabase functions new send-reset-email

Substitua o conteúdo gerado pelo arquivo local `send-reset-email.ts`.

## 3) Configurar variáveis da função
supabase secrets set RESEND_API_KEY=COLE_SUA_CHAVE
supabase secrets set RESET_FROM_EMAIL="GISPRAD <onboarding@resend.dev>"

## 4) Deploy da função
supabase functions deploy send-reset-email

## 5) Pegar URL da função
Formato:
https://wehlukgburcprreixwef.functions.supabase.co/send-reset-email

## 6) Colar no app.js
No arquivo `app.js`, preencher:
const RESET_EMAIL_FUNCTION_URL = "https://wehlukgburcprreixwef.functions.supabase.co/send-reset-email";

## 7) Publicar no GitHub
Suba o `app.js` atualizado e aguarde 1-2 minutos no GitHub Pages.

## 8) Testar
- Clique em "Esqueci minha senha"
- Informe e-mail cadastrado
- Verifique caixa de entrada
