const ADMIN_KEY = "xc_admin_logged";
let editingId = null;

function requireLogin() {
  const login = document.querySelector("#admin-login");
  const panel = document.querySelector("#admin-panel");
  if (!login || !panel) return;
  const logged = sessionStorage.getItem(ADMIN_KEY) === "true";
  login.hidden = logged;
  panel.hidden = !logged;
  if (logged) renderAdmin();
}

function bindLogin() {
  const form = document.querySelector("#login-form");
  if (!form) return;
  form.addEventListener("submit", event => {
    event.preventDefault();
    const password = new FormData(form).get("password");
    if (password === window.XC_CONFIG.adminPassword) {
      sessionStorage.setItem(ADMIN_KEY, "true");
      requireLogin();
    } else {
      alert("Senha incorreta.");
    }
  });
}

function bindLogout() {
  const button = document.querySelector("#logout");
  if (!button) return;
  button.addEventListener("click", () => {
    sessionStorage.removeItem(ADMIN_KEY);
    requireLogin();
  });
}

function formToCard(form) {
  const data = new FormData(form);
  return {
    id: editingId || `${normalizeText(data.get("administradora") || "carta")}-${Date.now()}`,
    tipo: data.get("tipo") || "Imóvel",
    administradora: data.get("administradora") || "",
    credito: Number(String(data.get("credito") || "0").replace(/\./g, "").replace(",", ".")),
    entrada: Number(String(data.get("entrada") || "0").replace(/\./g, "").replace(",", ".")),
    parcelas: data.get("parcelas") || "",
    parcelaBusca: Number(String(data.get("parcelaBusca") || "0").replace(/\./g, "").replace(",", ".")),
    status: data.get("status") || "Disponível",
    uso: data.get("uso") || "",
    observacaoPublica: data.get("observacaoPublica") || "",
    ocultarPublico: data.get("ocultarPublico") === "on",
    nomeDono: data.get("nomeDono") || "",
    telefoneDono: data.get("telefoneDono") || "",
    grupo: data.get("grupo") || "",
    cota: data.get("cota") || "",
    valorCompra: data.get("valorCompra") || "",
    comissao: data.get("comissao") || "",
    responsavel: data.get("responsavel") || "",
    observacaoInterna: data.get("observacaoInterna") || "",
    documentos: data.get("documentos") || "",
    criadoEm: editingId ? (getCards().find(card => card.id === editingId)?.criadoEm || new Date().toISOString()) : new Date().toISOString()
  };
}

function bindAdminForm() {
  const form = document.querySelector("#card-form");
  if (!form) return;
  form.addEventListener("submit", event => {
    event.preventDefault();
    const nextCard = formToCard(form);
    const cards = getCards();
    const updated = editingId
      ? cards.map(card => card.id === editingId ? nextCard : card)
      : [nextCard, ...cards];
    saveCards(updated);
    editingId = null;
    form.reset();
    document.querySelector("#submit-label").textContent = "Cadastrar carta";
    renderAdmin();
  });

  const cancel = document.querySelector("#cancel-edit");
  if (cancel) {
    cancel.addEventListener("click", () => {
      editingId = null;
      form.reset();
      document.querySelector("#submit-label").textContent = "Cadastrar carta";
    });
  }
}

function setForm(card) {
  const form = document.querySelector("#card-form");
  if (!form) return;
  editingId = card.id;
  form.tipo.value = card.tipo || "Imóvel";
  form.administradora.value = card.administradora || "";
  form.credito.value = String(card.credito || "").replace(".", ",");
  form.entrada.value = String(card.entrada || "").replace(".", ",");
  form.parcelas.value = card.parcelas || "";
  form.parcelaBusca.value = String(card.parcelaBusca || "").replace(".", ",");
  form.status.value = card.status || "Disponível";
  form.uso.value = card.uso || "";
  form.observacaoPublica.value = card.observacaoPublica || "";
  form.ocultarPublico.checked = Boolean(card.ocultarPublico);
  form.nomeDono.value = card.nomeDono || "";
  form.telefoneDono.value = card.telefoneDono || "";
  form.grupo.value = card.grupo || "";
  form.cota.value = card.cota || "";
  form.valorCompra.value = card.valorCompra || "";
  form.comissao.value = card.comissao || "";
  form.responsavel.value = card.responsavel || "";
  form.observacaoInterna.value = card.observacaoInterna || "";
  form.documentos.value = card.documentos || "";
  document.querySelector("#submit-label").textContent = "Salvar alterações";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAdmin() {
  const cards = getCards();
  const leads = getLeads();
  const list = document.querySelector("#admin-cards");
  const leadList = document.querySelector("#admin-leads");
  const summary = document.querySelector("#admin-summary");

  if (summary) {
    const disponiveis = cards.filter(card => card.status === "Disponível" && !card.ocultarPublico).length;
    const reservadas = cards.filter(card => card.status === "Reservada").length;
    const vendidas = cards.filter(card => card.status === "Vendida").length;
    summary.innerHTML = `
      <div><strong>${cards.length}</strong><span>cartas cadastradas</span></div>
      <div><strong>${disponiveis}</strong><span>disponíveis</span></div>
      <div><strong>${reservadas}</strong><span>reservadas</span></div>
      <div><strong>${vendidas}</strong><span>vendidas</span></div>
      <div><strong>${leads.length}</strong><span>leads locais</span></div>
    `;
  }

  if (list) {
    list.innerHTML = cards.length ? cards.map(card => `
      <tr>
        <td>${card.administradora}<br><small>${card.tipo}</small></td>
        <td>${formatCurrency(card.credito)}</td>
        <td>${formatCurrency(card.entrada)}</td>
        <td>${card.parcelas}</td>
        <td><span class="status ${normalizeText(card.status).replace(/\s+/g, "-")}">${card.status}</span></td>
        <td>${card.ocultarPublico ? "Oculta" : "Visível"}</td>
        <td class="table-actions">
          <button type="button" data-edit="${card.id}">Editar</button>
          <button type="button" data-status="${card.id}" data-next="Reservada">Reservar</button>
          <button type="button" data-status="${card.id}" data-next="Vendida">Vender</button>
          <button type="button" data-delete="${card.id}">Excluir</button>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="7">Nenhuma carta cadastrada.</td></tr>`;
  }

  if (leadList) {
    leadList.innerHTML = leads.length ? leads.map(lead => `
      <tr>
        <td>${lead.nome}</td>
        <td>${lead.whatsapp}</td>
        <td>${lead.carta}</td>
        <td>${new Date(lead.criadoEm).toLocaleString("pt-BR")}</td>
      </tr>
    `).join("") : `<tr><td colspan="4">Nenhum lead salvo neste navegador.</td></tr>`;
  }
}

function bindAdminTable() {
  document.addEventListener("click", event => {
    const edit = event.target.closest("[data-edit]");
    const status = event.target.closest("[data-status]");
    const remove = event.target.closest("[data-delete]");

    if (edit) {
      const card = getCards().find(item => item.id === edit.dataset.edit);
      if (card) setForm(card);
    }

    if (status) {
      const cards = getCards().map(card => card.id === status.dataset.status ? { ...card, status: status.dataset.next, ocultarPublico: status.dataset.next === "Vendida" ? true : card.ocultarPublico } : card);
      saveCards(cards);
      renderAdmin();
    }

    if (remove) {
      if (!confirm("Tem certeza que deseja excluir esta carta deste navegador?")) return;
      const cards = getCards().filter(card => card.id !== remove.dataset.delete);
      saveCards(cards);
      renderAdmin();
    }
  });
}

function bindTools() {
  const reset = document.querySelector("#reset-data");
  if (reset) {
    reset.addEventListener("click", () => {
      if (!confirm("Restaurar as cartas iniciais?")) return;
      localStorage.removeItem("xc_cartas_contempladas");
      renderAdmin();
    });
  }

  const exportButton = document.querySelector("#export-json");
  if (exportButton) {
    exportButton.addEventListener("click", () => {
      const payload = JSON.stringify({ cartas: getCards(), leads: getLeads() }, null, 2);
      const blob = new Blob([payload], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "xcapital-cartas-leads.json";
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindLogin();
  bindLogout();
  bindAdminForm();
  bindAdminTable();
  bindTools();
  requireLogin();
});
