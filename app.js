(function () {
  const CATS = ["IC", "TCC", "Mestrado", "Doutorado"];
  const STATUS = ["Iniciado", "Em andamento", "Revisado", "Concluído", "Submetido"];
  const WORK_TYPES = ["Projeto", "Relatório parcial", "Relatório Final", "TCC", "Dissertação", "Tese", "Resumo", "Boletim", "Artigo", "Outro"];
  const DATE_LABELS = {
    qualificacao: "Qualificação",
    defesa: "Defesa",
    entrega_parcial: "Entrega parcial",
    entrega_final: "Entrega final",
    submissao_artigo: "Submissão de artigo"
  };

  const STORAGE_KEY = "orientaHubState_prod_v1";

  const defaultState = {
    users: [
      { id: "o1", nome: "Álvaro", role: "orientador", senha: "ALTERE_A_SENHA_AQUI", email: "orientador@demo.com" }
    ],
    works: [],
    comments: [],
    audit: []
  };

  let state = loadState();
  let current = null;

  ensureOrientador();

  const app = document.getElementById("app");

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(defaultState));
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return JSON.parse(JSON.stringify(defaultState));
      parsed.users = Array.isArray(parsed.users) ? parsed.users : [];
      parsed.works = Array.isArray(parsed.works) ? parsed.works : [];
      parsed.comments = Array.isArray(parsed.comments) ? parsed.comments : [];
      parsed.audit = Array.isArray(parsed.audit) ? parsed.audit : [];
      return parsed;
    } catch (_) {
      return JSON.parse(JSON.stringify(defaultState));
    }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function ensureOrientador() {
    const orientador = state.users.find(u => u.id === "o1" || u.role === "orientador");
    if (!orientador) {
      state.users.unshift({ id: "o1", nome: "Álvaro", role: "orientador", senha: "1234", email: "orientador@demo.com" });
      save();
      return;
    }
    orientador.id = "o1";
    orientador.role = "orientador";
    orientador.nome = "Álvaro";
    orientador.senha = "1234";
    if (!orientador.email) orientador.email = "orientador@demo.com";
    save();
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizeText(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function byId(arr, id) {
    return arr.find(x => x.id === id);
  }

  function uid() {
    return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function val(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function addAudit(action, details) {
    state.audit.push({ ts: Date.now(), actor: current ? current.nome : "Sistema", action, details });
  }

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
        if (d !== null && d < 0) {
          out.push({ aluno, work: w, field: k, date: dt, diff: d });
        }
      });
    });
    out.sort((a, b) => a.diff - b.diff);
    return out;
  }

  function loginView() {
    app.innerHTML = `
      <div class="container">
        <div class="card" style="max-width:560px;margin:30px auto;">
          <h1>OrientaHub</h1>
          <small><strong>Versão:</strong> v2.1 (estável)</small>
          <div class="grid" style="margin-top:12px;">
            <input id="nome" placeholder="Nome" />
            <input id="senha" type="password" placeholder="Senha" />
            <label><input id="showSenhaLogin" type="checkbox" /> Mostrar senha</label>
            <button id="entrar">Entrar</button>
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
          <div class="row" style="margin-top:10px;">
            <button id="cadastrarAluno">Finalizar inscrição</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById("showSenhaLogin").onchange = e => {
      document.getElementById("senha").type = e.target.checked ? "text" : "password";
    };
    document.getElementById("showSenhaCadastro").onchange = e => {
      document.getElementById("csenha").type = e.target.checked ? "text" : "password";
    };

    document.getElementById("entrar").onclick = () => {
      const nome = normalizeText(val("nome"));
      const senha = val("senha");
      current = state.users.find(u => normalizeText(u.nome) === nome && String(u.senha) === senha) || null;
      if (!current && (nome === "alvaro" || nome === "álvaro" || nome === "orientador") && senha === "1234") {
        current = state.users.find(u => u.id === "o1") || state.users.find(u => u.role === "orientador") || null;
      }
      if (!current) {
        alert("Login inválido");
        return;
      }
      render();
    };

    document.getElementById("toggleCadastro").onclick = () => {
      const box = document.getElementById("cadastroBox");
      box.style.display = box.style.display === "none" ? "block" : "none";
    };

    document.getElementById("cadastrarAluno").onclick = () => {
      const nome = val("cnome");
      const email = val("cemail");
      const senha = val("csenha");
      const categoria = val("ccat");
      if (!nome || !email || !senha) {
        alert("Nome, email e senha são obrigatórios.");
        return;
      }
      if (state.users.some(u => normalizeText(u.nome) === normalizeText(nome))) {
        alert("Já existe um usuário com esse nome.");
        return;
      }
      state.users.push({
        id: uid(),
        nome,
        email,
        senha,
        role: "aluno",
        categoria,
        instituicao: val("cinstituicao"),
        curso: val("ccurso")
      });
      addAudit("Cadastro de aluno", `Aluno cadastrado: ${nome}`);
      save();
      alert("Aluno cadastrado com sucesso.");
    };
  }

  function topBar() {
    return `
      <div class="row" style="justify-content:space-between;margin-bottom:12px;">
        <h2>Olá, ${esc(current.nome)}</h2>
        <div class="row">
          <button class="alt" id="logout">Sair</button>
        </div>
      </div>
    `;
  }

  function reportAluno(alunoId) {
    const aluno = byId(state.users, alunoId);
    const ws = state.works.filter(w => w.alunoId === alunoId);
    const win = window.open("", "_blank");
    if (!win) return;

    let html = `<h1>Relatório do Aluno</h1><p><b>${esc(aluno.nome)}</b> | ${esc(aluno.categoria || "")}</p>`;
    ws.forEach(w => {
      const cmCount = state.comments.filter(c => c.workId === w.id).length;
      html += `
        <h2>${esc(w.titulo)} (${esc(w.tipo)})</h2>
        <p>Status: ${esc(w.status)} | Progresso: ${Number(w.progresso || 0)}%</p>
        <p>Revisão: ${esc((w.review && w.review.decision) || "Pendente")}</p>
        <p>Pendências: ${esc((w.review && w.review.pendencias) || "-")}</p>
        <p>Comentários: ${cmCount}</p>
      `;
    });

    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório</title><style>body{font-family:Arial;padding:20px}</style></head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  function reportGeral() {
    const alunos = state.users.filter(u => u.role === "aluno");
    const win = window.open("", "_blank");
    if (!win) return;

    let html = `<h1>Relatório Geral</h1><table border="1" cellspacing="0" cellpadding="6"><tr><th>Aluno</th><th>Categoria</th><th>Trabalhos</th></tr>`;
    alunos.forEach(a => {
      const n = state.works.filter(w => w.alunoId === a.id).length;
      html += `<tr><td>${esc(a.nome)}</td><td>${esc(a.categoria || "")}</td><td>${n}</td></tr>`;
    });
    html += `</table><h2>Auditoria</h2>`;
    state.audit.slice().reverse().forEach(x => {
      html += `<div>${new Date(x.ts).toLocaleString("pt-BR")} | ${esc(x.actor)} | ${esc(x.action)} | ${esc(x.details)}</div>`;
    });

    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório Geral</title><style>body{font-family:Arial;padding:20px}</style></head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  function workCard(w, isOrientador) {
    const aluno = byId(state.users, w.alunoId) || { nome: "Aluno" };
    const comments = state.comments.filter(c => c.workId === w.id);
    const review = w.review || { decision: "Pendente", pendencias: "" };

    return `
      <div class="card" style="margin-top:10px;">
        <div class="row" style="justify-content:space-between;">
          <strong>${esc(w.titulo)}</strong>
          <span class="badge">${esc(w.status || "Iniciado")}</span>
        </div>
        <small>${esc(aluno.nome)} | ${esc(w.tipo || "")}</small>
        <div><a href="${esc(w.linkDrive || "#")}" target="_blank">Abrir Drive</a></div>
        <div class="progress-wrap" style="margin-top:8px;"><div class="progress" style="width:${Number(w.progresso || 0)}%"></div></div>
        <small>${Number(w.progresso || 0)}%</small>

        <div style="margin-top:6px;"><span class="badge">Revisão: ${esc(review.decision || "Pendente")}</span></div>
        ${review.pendencias ? `<small>Pendências: ${esc(review.pendencias)}</small>` : ""}

        <div class="grid grid-2" style="margin-top:8px;">
          ${Object.keys(DATE_LABELS).map(k => `
            <label>${DATE_LABELS[k]}<input ${isOrientador ? "" : "disabled"} data-date="${k}" data-work="${w.id}" type="date" value="${esc((w.datas && w.datas[k]) || "")}" /></label>
          `).join("")}
        </div>

        ${isOrientador ? `
          <div class="row" style="margin-top:8px;">
            <select id="st_${w.id}">${STATUS.map(s => `<option ${s === w.status ? "selected" : ""}>${s}</option>`).join("")}</select>
            <input id="pg_${w.id}" type="number" min="0" max="100" value="${Number(w.progresso || 0)}" style="width:90px;" />
            <button data-save="${w.id}">Salvar</button>
          </div>
          <div class="row" style="margin-top:8px;">
            <input id="pend_${w.id}" placeholder="Pendências/ajustes" value="${esc(review.pendencias || "")}" style="flex:1;" />
            <button class="ghost" data-review="${w.id}" data-decision="Aprovado">Aprovar</button>
            <button class="warn" data-review="${w.id}" data-decision="Aprovado com ajustes">Aprovar c/ ajustes</button>
            <button class="alt" data-review="${w.id}" data-decision="Rejeitado">Rejeitar</button>
          </div>
        ` : ""}

        <h4>Anexos</h4>
        <div>${(w.anexos || []).length ? w.anexos.map(a => `<div>${esc(a.name)}</div>`).join("") : `<small>Sem anexos.</small>`}</div>
        ${isOrientador ? "" : `<div class="row" style="margin-top:6px;"><input id="file_${w.id}" type="file" multiple /><button class="ghost" data-upload="${w.id}">Enviar</button></div>`}

        <h4>Comentários</h4>
        <div class="chat">${comments.length ? comments.map(c => `<div class="msg"><strong>${esc((byId(state.users, c.autorId) || {}).nome || "")}</strong>${esc(c.msg)}</div>`).join("") : `<small>Sem comentários.</small>`}</div>
        <div class="row" style="margin-top:6px;"><input id="msg_${w.id}" placeholder="Escreva um comentário" style="flex:1;" /><button class="ghost" data-comment="${w.id}">Enviar</button></div>
      </div>
    `;
  }

  function orientadorView() {
    const alunos = state.users.filter(u => u.role === "aluno");
    const critical = collectCritical();

    const fAluno = val("fAluno");
    const fStatus = val("fStatus");
    const fTipo = val("fTipo");

    app.innerHTML = `
      <div class="container">
        ${topBar()}

        <div class="card">
          <h3>Filtros rápidos</h3>
          <div class="row">
            <select id="fAluno"><option value="">Todos os alunos</option>${alunos.map(a => `<option value="${a.id}" ${fAluno === a.id ? "selected" : ""}>${esc(a.nome)}</option>`).join("")}</select>
            <select id="fStatus"><option value="">Todos os status</option>${STATUS.map(s => `<option ${fStatus === s ? "selected" : ""}>${s}</option>`).join("")}</select>
            <select id="fTipo"><option value="">Todos os tipos</option>${WORK_TYPES.map(t => `<option ${fTipo === t ? "selected" : ""}>${t}</option>`).join("")}</select>
            <button class="ghost" id="applyFilter">Aplicar</button>
          </div>
        </div>

        <div class="card" style="margin-top:12px;border:2px solid #ef4444;">
          <h3 style="color:#b91c1c;">Atrasados críticos</h3>
          ${critical.length ? critical.map(r => `<div><small><b>${esc((r.aluno || {}).nome || "Aluno")}</b> - ${esc(r.work.titulo)} | ${esc(DATE_LABELS[r.field] || r.field)} | atrasado há ${Math.abs(r.diff)} dia(s)</small></div>`).join("") : `<small>Sem atrasos críticos.</small>`}
        </div>

        <div class="card" style="margin-top:12px;">
          <h3>Calendário mensal de prazos</h3>
          <small>Resumo: ${critical.length} prazo(s) atrasado(s).</small>
        </div>

        <div class="card" style="margin-top:12px;">
          <div class="row">
            <button id="reportGeral">Relatório geral (PDF/Impressão)</button>
            <button class="alt" id="goAluno">Modo aluno</button>
          </div>
        </div>

        ${CATS.map(cat => {
          const group = alunos.filter(a => a.categoria === cat);
          const body = group.map(al => {
            let ws = state.works.filter(w => w.alunoId === al.id);
            if (fAluno) ws = ws.filter(w => w.alunoId === fAluno);
            if (fStatus) ws = ws.filter(w => w.status === fStatus);
            if (fTipo) ws = ws.filter(w => w.tipo === fTipo);
            if (!ws.length) return "";
            return `
              <div class="card" style="margin:8px 0;background:#fff;">
                <div class="row" style="justify-content:space-between;"><strong>${esc(al.nome)}</strong><small>${esc(al.email || "")}</small></div>
                <small>${esc(al.instituicao || "")} ${al.curso ? "| " + esc(al.curso) : ""}</small>
                <div class="row" style="margin-top:6px;"><button class="ghost" data-report-aluno="${al.id}">Relatório deste aluno</button></div>
                ${ws.map(w => workCard(w, true)).join("")}
              </div>
            `;
          }).join("");
          return `<div class="card" style="margin-top:12px;"><h3>${cat}</h3>${body || `<small>Sem resultados.</small>`}</div>`;
        }).join("")}

        <div class="card" style="margin-top:12px;">
          <h3>Histórico de auditoria</h3>
          ${state.audit.slice().reverse().slice(0, 40).map(a => `<div><small>${new Date(a.ts).toLocaleString("pt-BR")} | ${esc(a.actor)} | ${esc(a.action)} | ${esc(a.details)}</small></div>`).join("") || `<small>Sem eventos.</small>`}
        </div>
      </div>
    `;

    document.getElementById("logout").onclick = () => {
      current = null;
      render();
    };
    document.getElementById("applyFilter").onclick = orientadorView;
    document.getElementById("reportGeral").onclick = reportGeral;
    document.getElementById("goAluno").onclick = () => {
      current = state.users.find(u => u.role === "aluno") || current;
      render();
    };

    app.querySelectorAll("button[data-report-aluno]").forEach(b => {
      b.onclick = () => reportAluno(b.getAttribute("data-report-aluno"));
    });

    bindSharedActions(true);
  }

  function alunoView() {
    const ws = state.works.filter(w => w.alunoId === current.id);

    app.innerHTML = `
      <div class="container">
        ${topBar()}

        <div class="card" style="margin-bottom:12px;">
          <h3>Novo trabalho</h3>
          <div class="row">
            <input id="wtit" placeholder="Título" />
            <select id="wtipo">${WORK_TYPES.map(t => `<option>${t}</option>`).join("")}</select>
            <input id="wlink" placeholder="Link do Drive" />
            <button id="addWork">Adicionar</button>
          </div>
        </div>

        <div class="card" style="margin-bottom:12px;">
          <div class="row"><button class="alt" id="goOrientador">Modo orientador</button></div>
        </div>

        <div class="card">
          <h3>Meus trabalhos</h3>
          ${ws.length ? ws.map(w => workCard(w, false)).join("") : `<small>Sem trabalhos.</small>`}
        </div>
      </div>
    `;

    document.getElementById("logout").onclick = () => {
      current = null;
      render();
    };

    document.getElementById("goOrientador").onclick = () => {
      current = state.users.find(u => u.id === "o1") || state.users.find(u => u.role === "orientador") || null;
      render();
    };

    document.getElementById("addWork").onclick = () => {
      const titulo = val("wtit");
      const tipo = val("wtipo");
      const linkDrive = val("wlink");
      if (!titulo) {
        alert("Título obrigatório");
        return;
      }
      state.works.push({
        id: uid(),
        alunoId: current.id,
        titulo,
        tipo,
        linkDrive,
        status: "Iniciado",
        progresso: 0,
        datas: { qualificacao: "", defesa: "", entrega_parcial: "", entrega_final: "", submissao_artigo: "" },
        review: { decision: "Pendente", pendencias: "" },
        anexos: []
      });
      addAudit("Novo trabalho", `${current.nome} criou: ${titulo}`);
      save();
      render();
    };

    bindSharedActions(false);
  }

  function bindSharedActions(isOrientador) {
    app.querySelectorAll("button[data-comment]").forEach(btn => {
      btn.onclick = () => {
        const wid = btn.getAttribute("data-comment");
        const input = document.getElementById("msg_" + wid);
        const msg = input ? input.value.trim() : "";
        if (!msg) return;
        state.comments.push({ id: uid(), workId: wid, autorId: current.id, msg, ts: Date.now() });
        addAudit("Comentário", `${current.nome} comentou no trabalho ${wid}`);
        save();
        render();
      };
    });

    app.querySelectorAll("input[data-date]").forEach(inp => {
      inp.onchange = () => {
        if (!isOrientador) return;
        const wid = inp.getAttribute("data-work");
        const key = inp.getAttribute("data-date");
        const w = byId(state.works, wid);
        if (!w) return;
        w.datas[key] = inp.value;
        addAudit("Prazo alterado", `${DATE_LABELS[key]} em ${w.titulo} -> ${inp.value}`);
        save();
      };
    });

    if (isOrientador) {
      app.querySelectorAll("button[data-save]").forEach(btn => {
        btn.onclick = () => {
          const wid = btn.getAttribute("data-save");
          const w = byId(state.works, wid);
          if (!w) return;
          const st = document.getElementById("st_" + wid);
          const pg = document.getElementById("pg_" + wid);
          w.status = st ? st.value : w.status;
          w.progresso = Math.max(0, Math.min(100, Number(pg ? pg.value : w.progresso) || 0));
          addAudit("Progresso atualizado", `${w.titulo} -> ${w.status}/${w.progresso}%`);
          save();
          render();
        };
      });

      app.querySelectorAll("button[data-review]").forEach(btn => {
        btn.onclick = () => {
          const wid = btn.getAttribute("data-review");
          const decision = btn.getAttribute("data-decision");
          const w = byId(state.works, wid);
          if (!w) return;
          const pend = document.getElementById("pend_" + wid);
          w.review = { decision, pendencias: pend ? pend.value : "" };
          addAudit("Revisão", `${w.titulo} -> ${decision}`);
          save();
          render();
        };
      });
    } else {
      app.querySelectorAll("button[data-upload]").forEach(btn => {
        btn.onclick = () => {
          const wid = btn.getAttribute("data-upload");
          const w = byId(state.works, wid);
          const f = document.getElementById("file_" + wid);
          if (!w || !f || !f.files || !f.files.length) {
            alert("Selecione arquivo(s)");
            return;
          }
          Array.from(f.files).forEach(file => {
            w.anexos.push({ name: file.name, size: file.size, ts: Date.now() });
          });
          w.review = { decision: "Pendente", pendencias: "" };
          addAudit("Upload", `${current.nome} enviou anexo em ${w.titulo}`);
          save();
          render();
        };
      });
    }
  }

  function render() {
    try {
      if (!current) {
        loginView();
        return;
      }
      if (current.role === "orientador") orientadorView();
      else alunoView();
    } catch (e) {
      app.innerHTML = `
        <div class="container">
          <div class="card">
            <h3>Erro ao carregar</h3>
            <pre>${esc(e && e.message ? e.message : String(e))}</pre>
            <button id="resetApp">Resetar app</button>
          </div>
        </div>
      `;
      document.getElementById("resetApp").onclick = () => {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      };
    }
  }

  save();
  render();
})();
