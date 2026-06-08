// Supabase Edge Function: send-reset-email
// Deploy: supabase functions deploy send-reset-email
// Env vars necessárias:
// RESEND_API_KEY
// RESET_FROM_EMAIL (ex: GISPRAD <no-reply@seudominio.com>)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { to, name, resetLink } = await req.json();
    if (!to || !resetLink) {
      return new Response("Missing fields", { status: 400 });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESET_FROM_EMAIL") || "GISPRAD <onboarding@resend.dev>";
    if (!apiKey) {
      return new Response("RESEND_API_KEY not configured", { status: 500 });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.6; color:#1f2937;">
        <h2>Redefinição de senha</h2>
        <p>Olá ${name || "usuário"},</p>
        <p>Recebemos uma solicitação para redefinir sua senha.</p>
        <p><a href="${resetLink}" style="display:inline-block;padding:10px 14px;background:#166534;color:#fff;text-decoration:none;border-radius:8px;">Redefinir senha</a></p>
        <p>Ou copie e cole este link no navegador:</p>
        <p>${resetLink}</p>
        <p>Se você não solicitou, pode ignorar este e-mail.</p>
      </div>
    `;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Redefinição de senha - GISPRAD",
        html
      })
    });

    if (!r.ok) {
      const txt = await r.text();
      return new Response(`Resend error: ${txt}`, { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(`Error: ${e.message || e}`, { status: 500 });
  }
});
