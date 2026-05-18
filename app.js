import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

(function () {
  const CATS = ["IC", "TCC", "Mestrado", "Doutorado"];
  const STATUS = ["Iniciado", "Em andamento", "Revisado", "Concluído", "Submetido"];
  const WORK_TYPES = ["Projeto", "Relatório parcial", "Relatório Final", "TCC", "Dissertação", "Tese", "Resumo", "Boletim", "Artigo", "Livro", "Capítulo de livro", "Outro"];
  const DATE_LABELS = {
    qualificacao: "Qualificação",
    defesa: "Defesa",
    entrega_parcial: "Entrega parcial",
    entrega_final: "Entrega final",
    submissao_artigo: "Submissão de artigo"
  };

  const SUPABASE_URL = "https://wehlukgburcprreixwef.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_tZkxKR4A8y6FLxBB_HkEmQ_JOtL-HVy";

  const defaultState = {
    users: [
      { id: "o1", nome: "Álvaro", role: "orientador", senha: "1234", email: "orientador@demo.com" }
    ],
    works: [],
    comments: [],
    audit: [],
    passwordResets: []
  };

  let state = JSON.parse(JSON.stringify(defaultState));
  let current = null;
  const filters = { aluno: "", status: "", tipo: "" };
  const alunoDraft = { titulo: "", tipo: "", linkDrive: "" };
  let booting = true;
  let pollingTimer = null;

  const appEl = document.getElementById("app");

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function normalizeText(s) { return String(s || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function byId(arr, id) { return arr.find(x => x.id === id); }
  function uid() { return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function val(id) { const el = document.getElementById(id); return el ? String(el.value || "").trim() : ""; }

  function ensureOrientador() {
    const o = state.users.find(u => u.id === "o1" || u.role === "orientador");
    if (!o) {
      state.users.unshift({ id: "o1", nome: "Álvaro", role: "orientador", senha: "1234", email: "orientador@demo.com" });
    } else {
      o.id = "o1"; o.role = "orientador"; o.nome = "Álvaro"; o.senha = "1234";
      if (!o.email) o.email = "orientador@demo.com";
    }
    if (!Array.isArray(state.passwordResets)) state.passwordResets = [];
  }

  function addAudit(action, details) { state.audit.push({ ts: Date.now(), actor: current ? current.nome : "Sistema", action, details }); }

  function daysDiff(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr + "T00:00:00");
    const now = new Date();
    const a = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((a - b) / 86400000);
  }

  function collectCritical() {
    const out = [];
    state.works.forEach(w => {
      const aluno = byId(state.users, w.alunoId);
      Object.keys(w.datas || {}).forEach(k => {
        const dt = w.datas[k];
        if (!dt) return;
        const d = daysDiff(dt);
        if (d !== null && d < 0) out.push({ aluno, work: w, field: k, date: dt, diff: d });
      });
    });
    out.sort((a, b) => a.diff - b.diff);
    return out;
  }

  function getClient() { return createClient(SUPABASE_URL, SUPABASE_ANON_KEY); }

  async function fetchRemoteState() {
    const supabase = getClient();
    const { data, error } = await supabase.from("app_state").select("state").eq("id", "main").single();
    if (error && error.code !== "PGRST116") throw error;
    if (!data) return null;
    return data.state;
  }

  async function saveRemoteState() {
    const supabase = getClient();
    const { error } = await supabase.from("app_state").upsert({ id: "main", state, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw error;
  }

  async function bootstrap() {
    const raw = await fetchRemoteState();
    if (!raw) {
      ensureOrientador();
      await saveRemoteState();
      return;
    }
    state = {
      users: Array.isArray(raw.users) ? raw.users : [],
      works: Array.isArray(raw.works) ? raw.works : [],
      comments: Array.isArray(raw.comments) ? raw.comments : [],
      audit: Array.isArray(raw.audit) ? raw.audit : [],
      passwordResets: Array.isArray(raw.passwordResets) ? raw.passwordResets : []
    };
    ensureOrientador();
    await saveRemoteState();
  }

  async function syncFromServer() {
    const raw = await fetchRemoteState();
    if (!raw) return;
    state = {
      users: Array.isArray(raw.users) ? raw.users : [],
      works: Array.isArray(raw.works) ? raw.works : [],
      comments: Array.isArray(raw.comments) ? raw.comments : [],
      audit: Array.isArray(raw.audit) ? raw.audit : [],
      passwordResets: Array.isArray(raw.passwordResets) ? raw.passwordResets : []
    };
    ensureOrientador();
    if (current) current = state.users.find(u => u.id === current.id) || null;
  }

  function startPolling() {
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = setInterval(async () => {
      try {
        if (!current) return;
        await syncFromServer();
        if (current.role === "orientador") render();
      } catch (_) {}
    }, 4000);
  }

  function makeResetToken() { return "r_" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function resetTokenFromHash() {
    const h = String(window.location.hash || "");
    if (!h.startsWith("#reset=")) return "";
    return decodeURIComponent(h.replace("#reset=", "").trim());
  }

  function findValidReset(token) {
    const item = (state.passwordResets || []).find(r => r.token === token);
    if (!item) return null;
    if (item.used) return null;
    if (item.expiresAt <= Date.now()) return null;
    return item;
  }

  async function requestPasswordReset(email) {
    await syncFromServer();
    const user = state.users.find(u => normalizeText(u.email || "") === normalizeText(email || ""));
    if (!user) return alert("E-mail não encontrado.");

    const token = makeResetToken();
    const exp = Date.now() + (30 * 60 * 1000);
    state.passwordResets = (state.passwordResets || []).filter(r => !r.used && r.expiresAt > Date.now());
    state.passwordResets.push({ token, userId: user.id, email: user.email || email, expiresAt: exp, used: false });
    addAudit("Recuperação de senha", `Solicitação para ${user.nome}`);
    await saveRemoteState();

    const resetLink = `${window.location.origin}${window.location.pathname}#reset=${encodeURIComponent(token)}`;
    const subject = encodeURIComponent("Redefinição de senha - GISPRAD");
    const body = encodeURIComponent(`Olá ${user.nome},\n\nUse este link para redefinir sua senha (válido por 30 minutos):\n${resetLink}\n\nSe você não solicitou, ignore este e-mail.`);
    window.open(`mailto:${encodeURIComponent(user.email || email)}?subject=${subject}&body=${body}`, "_blank");
    alert("E-mail de redefinição aberto. Envie para concluir.");
  }

  function resetPasswordView(token) {
    const r = findValidReset(token);
    if (!r) {
      appEl.innerHTML = `<div class="container"><div class="card"><h3>Link inválido ou expirado</h3><button id="goLogin">Voltar ao login</button></div></div>`;
      document.getElementById("goLogin").onclick = () => { window.location.hash = ""; render(); };
      return;
    }
    appEl.innerHTML = `<div class="container"><div class="card" style="max-width:520px;margin:30px auto;"><h3>Redefinir senha</h3><input id="newPass" type="password" placeholder="Nova senha" /><input id="newPass2" type="password" placeholder="Confirmar nova senha" /><div class="row" style="margin-top:10px;"><button id="saveNewPass">Salvar nova senha</button><button id="cancelReset" class="ghost">Cancelar</button></div></div></div>`;
    document.getElementById("cancelReset").onclick = () => { window.location.hash = ""; render(); };
    document.getElementById("saveNewPass").onclick = async () => {
      const p1 = val("newPass");
      const p2 = val("newPass2");
      if (!p1 || p1.length < 4) return alert("Use ao menos 4 caracteres.");
      if (p1 !== p2) return alert("As senhas não conferem.");
      const user = byId(state.users, r.userId);
      if (!user) return alert("Usuário não encontrado.");
      user.senha = p1;
      r.used = true;
      addAudit("Senha redefinida", `Senha alterada para ${user.nome}`);
      await saveRemoteState();
      window.location.hash = "";
      alert("Senha alterada com sucesso.");
      render();
    };
  }

  function loginView() {
    appEl.innerHTML = `
      <div class="container login-shell">
        <div class="card login-card" style="max-width:560px;margin:30px auto;">
          <img src="gisprad-logo.jpeg" alt="Logo GISPRAD" class="login-logo" />
          <h1>OrientaHub</h1>
          <small><strong>Versão:</strong> v3.2 (Supabase)</small>
          <div class="grid" style="margin-top:12px;">
            <input id="nome" placeholder="Nome" />
            <input id="senha" type="password" placeholder="Senha" />
            <label><input id="showSenhaLogin" type="checkbox" /> Mostrar senha</label>
            <button id="entrar">Entrar</button>
            <button id="forgotPass" class="ghost">Esqueci minha senha</button>
            <button id="toggleCadastro" class="ghost">Sou aluno e quero me cadastrar</button>
            <small>Plataforma de acompanhamento acadêmico.</small>
          </div>
        </div>

        <div id="cadastroBox" class="card" style="max-width:760px;margin:0 auto;display:none;">
          <h3>Inscrição do aluno</h3>
          <div class="grid grid-2" style="margin-top:10px;">
            <input id="cnome" placeholder="Nome completo" />
            <input id="cemail" placeholder="Email" />
            <input id="csenha" type="password" placeholder="Senha" />
            <label><input id="showSenhaCadastro" type="checkbox" /> Mostrar senha</label>
            <select id="ccat">${CATS.map(c => `<option>${c}</option>`).join("")}</select>
            <input id="cinstituicao" placeholder="Instituição" />
            <input id="ccurso" placeholder="Curso" />
          </div>
          <div class="row" style="margin-top:10px;"><button id="cadastrarAluno">Finalizar inscrição</button></div>
        </div>
      </div>
    `;

    document.getElementById("showSenhaLogin").onchange = e => { document.getElementById("senha").type = e.target.checked ? "text" : "password"; };
    document.getElementById("showSenhaCadastro").onchange = e => { document.getElementById("csenha").type = e.target.checked ? "text" : "password"; };

    document.getElementById("entrar").onclick = async () => {
      try {
        await syncFromServer();
        const nome = normalizeText(val("nome"));
        const senha = val("senha");
        current = state.users.find(u => normalizeText(u.nome) === nome && String(u.senha) === senha) || null;
        if (!current && nome === "orientador" && senha === "1234") current = state.users.find(u => u.id === "o1") || state.users.find(u => u.role === "orientador") || null;
        if (!current) return alert("Login inválido");
        render();
      } catch (_) { alert("Falha ao conectar no banco online."); }
    };

    document.getElementById("forgotPass").onclick = async () => {
      const email = prompt("Digite seu e-mail cadastrado:");
      if (!email) return;
      await requestPasswordReset(email.trim());
    };

    document.getElementById("toggleCadastro").onclick = () => {
      const box = document.getElementById("cadastroBox");
      box.style.display = box.style.display === "none" ? "block" : "none";
    };

    document.getElementById("cadastrarAluno").onclick = async () => {
      const nome = val("cnome"), email = val("cemail"), senha = val("csenha"), categoria = val("ccat");
      if (!nome || !email || !senha) return alert("Nome, email e senha são obrigatórios.");
      await syncFromServer();
      if (state.users.some(u => normalizeText(u.nome) === normalizeText(nome))) return alert("Já existe um usuário com esse nome.");
      state.users.push({ id: uid(), nome, email, senha, role: "aluno", categoria, instituicao: val("cinstituicao"), curso: val("ccurso") });
      addAudit("Cadastro de aluno", `Aluno cadastrado: ${nome}`);
      await saveRemoteState();
      alert("Aluno cadastrado com sucesso.");
    };
  }

  function topBar() {
    return `<div class="row" style="justify-content:space-between;margin-bottom:12px;"><h2>Olá, ${esc(current.nome)}</h2><div class="row"><button class="alt" id="logout">Sair</button></div></div>`;
  }

  function workCard(w, isOrientador) {
    const aluno = byId(state.users, w.alunoId) || { nome: "Aluno" };
    const comments = state.comments.filter(c => c.workId === w.id);
    const review = w.review || { decision: "Pendente", pendencias: "" };
    return `<div class="card" style="margin-top:10px;"><div class="row" style="justify-content:space-between;"><strong>${esc(w.titulo)}</strong><span class="badge">${esc(w.status || "Iniciado")}</span></div><small>${esc(aluno.nome)} | ${esc(w.tipo || "")}</small>${isOrientador ? "" : `<div class="row" style="margin-top:6px;"><button class="ghost" data-edit-title="${w.id}">Editar título</button><button class="alt" data-delete-work="${w.id}">Apagar trabalho</button></div>`}<div><a href="${esc(w.linkDrive || "#")}" target="_blank">Abrir Drive</a></div><div class="progress-wrap" style="margin-top:8px;"><div class="progress" style="width:${Number(w.progresso || 0)}%"></div></div><small>${Number(w.progresso || 0)}%</small><div style="margin-top:6px;"><span class="badge">Revisão: ${esc(review.decision || "Pendente")}</span></div>${review.pendencias ? `<small>Pendências: ${esc(review.pendencias)}</small>` : ""}<div class="grid grid-2" style="margin-top:8px;">${Object.keys(DATE_LABELS).map(k => `<label>${DATE_LABELS[k]}<input ${isOrientador ? "" : "disabled"} data-date="${k}" data-work="${w.id}" type="date" value="${esc((w.datas && w.datas[k]) || "")}" /></label>`).join("")}</div>${isOrientador ? `<div class="row" style="margin-top:8px;"><select id="st_${w.id}">${STATUS.map(s => `<option ${s === w.status ? "selected" : ""}>${s}</option>`).join("")}</select><input id="pg_${w.id}" type="number" min="0" max="100" value="${Number(w.progresso || 0)}" style="width:90px;" /><button data-save="${w.id}">Salvar</button></div><div class="row" style="margin-top:8px;"><input id="pend_${w.id}" placeholder="Pendências/ajustes" value="${esc(review.pendencias || "")}" style="flex:1;" /><button class="ghost" data-review="${w.id}" data-decision="Aprovado">Aprovar</button><button class="warn" data-review="${w.id}" data-decision="Aprovado com ajustes">Aprovar c/ ajustes</button><button class="alt" data-review="${w.id}" data-decision="Rejeitado">Rejeitar</button></div>` : ""}<h4>Anexos</h4><div>${(w.anexos || []).length ? w.anexos.map(a => `<div>${esc(a.name)}</div>`).join("") : `<small>Sem anexos.</small>`}</div>${isOrientador ? "" : `<div class="row" style="margin-top:6px;"><input id="file_${w.id}" type="file" multiple /><button class="ghost" data-upload="${w.id}">Enviar</button></div>`}<h4>Comentários</h4><div class="chat">${comments.length ? comments.map(c => `<div class="msg"><strong>${esc((byId(state.users, c.autorId) || {}).nome || "")}</strong>${esc(c.msg)}</div>`).join("") : `<small>Sem comentários.</small>`}</div><div class="row" style="margin-top:6px;"><input id="msg_${w.id}" placeholder="Escreva um comentário" style="flex:1;" /><button class="ghost" data-comment="${w.id}">Enviar</button></div></div>`;
  }

  function orientadorView() {
    const alunos = state.users.filter(u => u.role === "aluno");
    const critical = collectCritical();
    const fAluno = filters.aluno;
    const fStatus = filters.status;
    const fTipo = filters.tipo;

    appEl.innerHTML = `<div class="container">${topBar()}<div class="card"><h3>Filtros rápidos</h3><div class="row"><select id="fAluno"><option value="">Todos os alunos</option>${alunos.map(a => `<option value="${a.id}" ${fAluno === a.id ? "selected" : ""}>${esc(a.nome)}</option>`).join("")}</select><select id="fStatus"><option value="">Todos os status</option>${STATUS.map(s => `<option value="${s}" ${fStatus === s ? "selected" : ""}>${s}</option>`).join("")}</select><select id="fTipo"><option value="">Todos os tipos</option>${WORK_TYPES.map(t => `<option value="${t}" ${fTipo === t ? "selected" : ""}>${t}</option>`).join("")}</select><button class="ghost" id="applyFilter">Aplicar</button><button class="alt" id="clearFilter">Limpar</button></div></div><div class="card" style="margin-top:12px;border:2px solid #ef4444;"><h3 style="color:#b91c1c;">Atrasados críticos</h3>${critical.length ? critical.map(r => `<div><small><b>${esc((r.aluno || {}).nome || "Aluno")}</b> - ${esc(r.work.titulo)} | ${esc(DATE_LABELS[r.field] || r.field)} | atrasado há ${Math.abs(r.diff)} dia(s)</small></div>`).join("") : `<small>Sem atrasos críticos.</small>`}</div>${CATS.map(cat => { const group = alunos.filter(a => a.categoria === cat).filter(a => !fAluno || a.id === fAluno); const body = group.map(al => { let ws = state.works.filter(w => w.alunoId === al.id); if (fAluno) ws = ws.filter(w => w.alunoId === fAluno); if (fStatus) ws = ws.filter(w => w.status === fStatus); if (fTipo) ws = ws.filter(w => w.tipo === fTipo); return `<div class="card" style="margin:8px 0;background:#fff;"><div class="row" style="justify-content:space-between;"><strong>${esc(al.nome)}</strong><small>${esc(al.email || "")}</small></div><small>${esc(al.instituicao || "")} ${al.curso ? "| " + esc(al.curso) : ""}</small><div class="row" style="margin-top:6px;"><button class="alt" data-delete-aluno="${al.id}">Apagar aluno</button></div>${ws.length ? ws.map(w => workCard(w, true)).join("") : "<small>Sem trabalhos para este filtro.</small>"}</div>`; }).join(""); return `<div class="card" style="margin-top:12px;"><h3>${cat}</h3>${body || `<small>Sem resultados.</small>`}</div>`; }).join("")}</div>`;

    document.getElementById("logout").onclick = () => { current = null; render(); };
    document.getElementById("applyFilter").onclick = () => { filters.aluno = val("fAluno"); filters.status = val("fStatus"); filters.tipo = val("fTipo"); orientadorView(); };
    document.getElementById("clearFilter").onclick = () => { filters.aluno = ""; filters.status = ""; filters.tipo = ""; orientadorView(); };
    document.getElementById("fAluno").onchange = () => { filters.aluno = val("fAluno"); orientadorView(); };
    document.getElementById("fStatus").onchange = () => { filters.status = val("fStatus"); orientadorView(); };
    document.getElementById("fTipo").onchange = () => { filters.tipo = val("fTipo"); orientadorView(); };

    appEl.querySelectorAll("button[data-delete-aluno]").forEach(btn => {
      btn.onclick = async () => {
        const aid = btn.getAttribute("data-delete-aluno");
        const al = byId(state.users, aid);
        if (!al) return;
        const ok = confirm(`Tem certeza que deseja apagar o aluno "${al.nome}" e todos os trabalhos dele?`);
        if (!ok) return;
        const workIds = state.works.filter(w => w.alunoId === aid).map(w => w.id);
        state.users = state.users.filter(u => u.id !== aid);
        state.works = state.works.filter(w => w.alunoId !== aid);
        state.comments = state.comments.filter(c => !workIds.includes(c.workId));
        addAudit("Exclusão de aluno", `Orientador removeu ${al.nome}`);
        await saveRemoteState();
        orientadorView();
      };
    });

    bindSharedActions(true);
  }

  function alunoView() {
    const ws = state.works.filter(w => w.alunoId === current.id);
    appEl.innerHTML = `<div class="container">${topBar()}<div class="card" style="margin-bottom:12px;"><h3>Novo trabalho</h3><div class="row"><input id="wtit" placeholder="Título" value="${esc(alunoDraft.titulo)}" /><select id="wtipo"><option value="" ${alunoDraft.tipo ? "" : "selected"}>Selecione o tipo</option>${WORK_TYPES.map(t => `<option value="${esc(t)}" ${alunoDraft.tipo === t ? "selected" : ""}>${t}</option>`).join("")}</select><input id="wlink" placeholder="Link do Drive" value="${esc(alunoDraft.linkDrive)}" /><button id="addWork">Adicionar</button></div></div><div class="card"><h3>Meus trabalhos</h3>${ws.length ? ws.map(w => workCard(w, false)).join("") : `<small>Sem trabalhos.</small>`}</div></div>`;

    document.getElementById("logout").onclick = () => { current = null; render(); };
    const wTit = document.getElementById("wtit");
    const wTipo = document.getElementById("wtipo");
    const wLink = document.getElementById("wlink");
    if (wTit) wTit.oninput = () => { alunoDraft.titulo = wTit.value || ""; if (wTipo && alunoDraft.tipo) wTipo.value = alunoDraft.tipo; };
    if (wTipo) {
      const syncTipo = () => { alunoDraft.tipo = (wTipo.value || ""); };
      wTipo.onchange = syncTipo; wTipo.oninput = syncTipo; wTipo.onblur = syncTipo; wTipo.onclick = syncTipo; syncTipo();
    }
    if (wLink) wLink.oninput = () => { alunoDraft.linkDrive = wLink.value || ""; };

    document.getElementById("addWork").onclick = async () => {
      const titulo = val("wtit");
      const tipoEl = document.getElementById("wtipo");
      const tipoDom = tipoEl ? String(tipoEl.value || "").trim() : "";
      const tipo = String(alunoDraft.tipo || tipoDom || "").trim();
      const linkDrive = val("wlink");
      if (!titulo) return alert("Título obrigatório");
      if (!tipo) return alert("Selecione o tipo do trabalho.");
      state.works.push({ id: uid(), alunoId: current.id, titulo, tipo, linkDrive, status: "Iniciado", progresso: 0, datas: { qualificacao: "", defesa: "", entrega_parcial: "", entrega_final: "", submissao_artigo: "" }, review: { decision: "Pendente", pendencias: "" }, anexos: [] });
      addAudit("Novo trabalho", `${current.nome} criou: ${titulo}`);
      await saveRemoteState();
      alunoDraft.titulo = ""; alunoDraft.tipo = ""; alunoDraft.linkDrive = "";
      render();
    };

    bindSharedActions(false);
  }

  function bindSharedActions(isOrientador) {
    appEl.querySelectorAll("button[data-comment]").forEach(btn => {
      btn.onclick = async () => {
        const wid = btn.getAttribute("data-comment");
        const input = document.getElementById("msg_" + wid);
        const msg = input ? input.value.trim() : "";
        if (!msg) return;
        state.comments.push({ id: uid(), workId: wid, autorId: current.id, msg, ts: Date.now() });
        addAudit("Comentário", `${current.nome} comentou no trabalho ${wid}`);
        await saveRemoteState();
        render();
      };
    });

    appEl.querySelectorAll("input[data-date]").forEach(inp => {
      inp.onchange = async () => {
        if (!isOrientador) return;
        const wid = inp.getAttribute("data-work");
        const key = inp.getAttribute("data-date");
        const w = byId(state.works, wid);
        if (!w) return;
        w.datas[key] = inp.value;
        addAudit("Prazo alterado", `${DATE_LABELS[key]} em ${w.titulo} -> ${inp.value}`);
        await saveRemoteState();
      };
    });

    if (isOrientador) {
      appEl.querySelectorAll("button[data-save]").forEach(btn => {
        btn.onclick = async () => {
          const wid = btn.getAttribute("data-save");
          const w = byId(state.works, wid);
          if (!w) return;
          const st = document.getElementById("st_" + wid);
          const pg = document.getElementById("pg_" + wid);
          w.status = st ? st.value : w.status;
          w.progresso = Math.max(0, Math.min(100, Number(pg ? pg.value : w.progresso) || 0));
          addAudit("Progresso atualizado", `${w.titulo} -> ${w.status}/${w.progresso}%`);
          await saveRemoteState();
          render();
        };
      });

      appEl.querySelectorAll("button[data-review]").forEach(btn => {
        btn.onclick = async () => {
          const wid = btn.getAttribute("data-review");
          const decision = btn.getAttribute("data-decision");
          const w = byId(state.works, wid);
          if (!w) return;
          const pend = document.getElementById("pend_" + wid);
          w.review = { decision, pendencias: pend ? pend.value : "" };
          addAudit("Revisão", `${w.titulo} -> ${decision}`);
          await saveRemoteState();
          render();
        };
      });
    } else {
      appEl.querySelectorAll("button[data-edit-title]").forEach(btn => {
        btn.onclick = async () => {
          const wid = btn.getAttribute("data-edit-title");
          const w = byId(state.works, wid);
          if (!w) return;
          const novoTitulo = prompt("Novo título do trabalho:", w.titulo || "");
          if (novoTitulo === null) return;
          const tituloFinal = String(novoTitulo).trim();
          if (!tituloFinal) return alert("Título não pode ficar vazio.");
          w.titulo = tituloFinal;
          addAudit("Edição de trabalho", `${current.nome} alterou título do trabalho ${wid}`);
          await saveRemoteState();
          render();
        };
      });

      appEl.querySelectorAll("button[data-delete-work]").forEach(btn => {
        btn.onclick = async () => {
          const wid = btn.getAttribute("data-delete-work");
          const w = byId(state.works, wid);
          if (!w) return;
          const ok = confirm(`Tem certeza que deseja apagar o trabalho "${w.titulo}"?`);
          if (!ok) return;
          state.works = state.works.filter(x => x.id !== wid);
          state.comments = state.comments.filter(c => c.workId !== wid);
          addAudit("Exclusão de trabalho", `${current.nome} apagou o trabalho ${w.titulo}`);
          await saveRemoteState();
          render();
        };
      });

      appEl.querySelectorAll("button[data-upload]").forEach(btn => {
        btn.onclick = async () => {
          const wid = btn.getAttribute("data-upload");
          const w = byId(state.works, wid);
          const f = document.getElementById("file_" + wid);
          if (!w || !f || !f.files || !f.files.length) return alert("Selecione arquivo(s)");
          Array.from(f.files).forEach(file => w.anexos.push({ name: file.name, size: file.size, ts: Date.now() }));
          w.review = { decision: "Pendente", pendencias: "" };
          addAudit("Upload", `${current.nome} enviou anexo em ${w.titulo}`);
          await saveRemoteState();
          render();
        };
      });
    }
  }

  function render() {
    if (booting) {
      appEl.innerHTML = `<div class="container"><div class="card"><h3>Conectando Supabase...</h3></div></div>`;
      return;
    }
    const tok = resetTokenFromHash();
    if (!current && tok) return resetPasswordView(tok);
    if (!current) return loginView();
    if (current.role === "orientador") orientadorView();
    else alunoView();
  }

  async function start() {
    try {
      if (!SUPABASE_URL.includes("http") || SUPABASE_ANON_KEY.includes("COLE_")) throw new Error("Preencha SUPABASE_URL e SUPABASE_ANON_KEY no app.js");
      await bootstrap();
      booting = false;
      startPolling();
      render();
    } catch (e) {
      appEl.innerHTML = `<div class="container"><div class="card"><h3>Erro de configuração Supabase</h3><pre>${esc(e.message || String(e))}</pre></div></div>`;
    }
  }

  start();
})();
