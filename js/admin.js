
const ADMIN_PASSWORD = "xcapital2026";
const STORAGE_KEY = "xc_cartas_contempladas";
const LEADS_KEY = "xc_leads";

let editingId = null;
let supabaseClient = null;

function initSupabase() {
  if (!window.supabase || !window.XC_SUPABASE_CONFIG) return null;
  const config = window.XC_SUPABASE_CONFIG;
  if (!config.url || !config.anonKey) return null;
  supabaseClient = window.supabase.createClient(config.url, config.anonKey);
  return supabaseClient;
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseMoney(value) {
  if (value === null || value === undefined || value === "") return null;
  const clean = String(value).replace(/[R$\s.]/g, "").replace(",", ".");
  const number = Number(clean);
  return Number.isFinite(number) ? number : null;
}

function toCard(row) {
  return {
    id: row.id,
    tipo: row.tipo || "",
    administradora: row.administradora || "",
    credito: Number(row.credito || 0),
    entrada: Number(row.entrada || 0),
    parcelas: row.parcelas || "",
    parcelaBusca: Number(row.parcela_busca || 0),
    status: row.status || "Disponível",
    uso: row.uso || "",
    observacaoPublica: row.observacao_publica || "",
    ocultarPublico: Boolean(row.ocultar_publico),
    nomeDono: row.nome_dono || "",
    telefoneDono: row.telefone_dono || "",
    grupo: row.grupo || "",
    cota: row.cota || "",
    valorCompra: row.valor_compra || "",
    comissao: row.comissao || "",
    responsavel: row.responsavel || "",
    documentos: row.documentos || "",
    observacaoInterna: row.observacao_interna || ""
  };
}

function toCardRow(card) {
  return {
    tipo: card.tipo,
    administradora: card.administradora,
    credito: Number(card.credito || 0),
    entrada: Number(card.entrada || 0),
    parcelas: card.parcelas,
    parcela_busca: Number(card.parcelaBusca || 0),
    status: card.status || "Disponível",
    uso: card.uso || "",
    observacao_publica: card.observacaoPublica || "",
    ocultar_publico: Boolean(card.ocultarPublico),
    nome_dono: card.nomeDono || null,
    telefone_dono: card.telefoneDono || null,
    grupo: card.grupo || null,
    cota: card.cota || null,
    valor_compra: parseMoney(card.valorCompra),
    comissao: parseMoney(card.comissao),
    responsavel: card.responsavel || null,
    documentos: card.documentos || null,
    observacao_interna: card.observacaoInterna || null,
    atualizado_em: new Date().toISOString()
  };
}

function getInitialCards() {
  return JSON.parse(JSON.stringify(window.XC_INITIAL_CARDS || []));
}

function getCardsLocal() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return getInitialCards();
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : getInitialCards();
  } catch {
    return getInitialCards();
  }
}

async function getCards() {
  if (supabaseClient) {
    const result = await supabaseClient
      .from("cartas")
      .select("*")
      .order("criado_em", { ascending: false });

    if (!result.error && Array.isArray(result.data)) return result.data.map(toCard);

    console.error("Erro ao buscar cartas no Supabase:", result.error);
    alert("Erro ao buscar cartas no Supabase. Confirme se você rodou o SQL completo e publicou a versão nova.");
  }

  return getCardsLocal();
}

function saveCardsLocal(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

async function saveCard(card) {
  if (supabaseClient) {
    const payload = toCardRow(card);

    if (editingId) {
      const result = await supabaseClient.from("cartas").update(payload).eq("id", editingId);
      if (result.error) throw result.error;
      return;
    }

    const result = await supabaseClient.from("cartas").insert(payload);
    if (result.error) throw result.error;
    return;
  }

  const cards = getCardsLocal();
  if (editingId) {
    const index = cards.findIndex(item => item.id === editingId);
    if (index >= 0) cards[index] = { ...cards[index], ...card, id: editingId };
  } else {
    cards.unshift({ ...card, id: crypto.randomUUID() });
  }
  saveCardsLocal(cards);
}

async function deleteCard(id) {
  if (supabaseClient) {
    const result = await supabaseClient.from("cartas").delete().eq("id", id);
    if (result.error) throw result.error;
    return;
  }

  const cards = getCardsLocal().filter(card => card.id !== id);
  saveCardsLocal(cards);
}

async function updateStatus(id, status, ocultarPublico = null) {
  if (supabaseClient) {
    const payload = { status, atualizado_em: new Date().toISOString() };
    if (ocultarPublico !== null) payload.ocultar_publico = ocultarPublico;

    const result = await supabaseClient.from("cartas").update(payload).eq("id", id);
    if (result.error) throw result.error;
    return;
  }

  const cards = getCardsLocal().map(card => {
    if (card.id !== id) return card;
    return { ...card, status, ocultarPublico: ocultarPublico === null ? card.ocultarPublico : ocultarPublico };
  });
  saveCardsLocal(cards);
}

async function getLeads() {
  if (supabaseClient) {
    const result = await supabaseClient
      .from("leads")
      .select("*")
      .order("criado_em", { ascending: false });

    if (!result.error && Array.isArray(result.data)) return result.data;
    console.warn("Erro ao buscar leads:", result.error);
  }

  const stored = localStorage.getItem(LEADS_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getFormCard() {
  const form = document.querySelector("#card-form");
  const formData = new FormData(form);

  return {
    tipo: formData.get("tipo"),
    administradora: formData.get("administradora"),
    credito: parseMoney(formData.get("credito")) || 0,
    entrada: parseMoney(formData.get("entrada")) || 0,
    parcelas: formData.get("parcelas"),
    parcelaBusca: parseMoney(formData.get("parcelaBusca")) || 0,
    status: formData.get("status"),
    uso: formData.get("uso"),
    observacaoPublica: formData.get("observacaoPublica"),
    ocultarPublico: formData.get("ocultarPublico") === "on",
    nomeDono: formData.get("nomeDono"),
    telefoneDono: formData.get("telefoneDono"),
    grupo: formData.get("grupo"),
    cota: formData.get("cota"),
    valorCompra: formData.get("valorCompra"),
    comissao: formData.get("comissao"),
    responsavel: formData.get("responsavel"),
    documentos: formData.get("documentos"),
    observacaoInterna: formData.get("observacaoInterna")
  };
}

function fillForm(card) {
  const form = document.querySelector("#card-form");

  const fields = {
    tipo: card.tipo,
    administradora: card.administradora,
    credito: card.credito,
    entrada: card.entrada,
    parcelas: card.parcelas,
    parcelaBusca: card.parcelaBusca,
    status: card.status,
    uso: card.uso,
    observacaoPublica: card.observacaoPublica,
    nomeDono: card.nomeDono,
    telefoneDono: card.telefoneDono,
    grupo: card.grupo,
    cota: card.cota,
    valorCompra: card.valorCompra,
    comissao: card.comissao,
    responsavel: card.responsavel,
    documentos: card.documentos,
    observacaoInterna: card.observacaoInterna
  };

  Object.entries(fields).forEach(([name, value]) => {
    const input = form.elements[name];
    if (input) input.value = value ?? "";
  });

  form.elements.ocultarPublico.checked = Boolean(card.ocultarPublico);
  editingId = card.id;
  document.querySelector("#submit-label").textContent = "Salvar alterações";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  document.querySelector("#card-form").reset();
  editingId = null;
  document.querySelector("#submit-label").textContent = "Cadastrar carta";
}

function renderSummary(cards) {
  const target = document.querySelector("#admin-summary");
  const available = cards.filter(card => card.status === "Disponível").length;
  const reserved = cards.filter(card => card.status === "Reservada").length;
  const sold = cards.filter(card => card.status === "Vendida").length;
  const hidden = cards.filter(card => card.ocultarPublico).length;

  target.innerHTML = `
    <div><strong>${cards.length}</strong><span>cartas totais</span></div>
    <div><strong>${available}</strong><span>disponíveis</span></div>
    <div><strong>${reserved}</strong><span>reservadas</span></div>
    <div><strong>${sold}</strong><span>vendidas</span></div>
    <div><strong>${hidden}</strong><span>ocultas</span></div>
  `;
}

async function renderCardsAdmin() {
  const cards = await getCards();
  renderSummary(cards);

  const tbody = document.querySelector("#admin-cards");
  tbody.innerHTML = cards.map(card => `
    <tr>
      <td><strong>${card.administradora}</strong><br><small>${card.tipo} | ${card.uso || "Sem uso informado"}</small></td>
      <td>${formatCurrency(card.credito)}</td>
      <td>${formatCurrency(card.entrada)}</td>
      <td>${card.parcelas}</td>
      <td>${card.status}</td>
      <td>${card.ocultarPublico ? "Oculta" : "Visível"}</td>
      <td>
        <div class="table-actions">
          <button type="button" data-edit="${card.id}">Editar</button>
          <button type="button" data-status="${card.id}" data-new-status="Disponível">Disponível</button>
          <button type="button" data-status="${card.id}" data-new-status="Reservada">Reservar</button>
          <button type="button" data-status="${card.id}" data-new-status="Vendida" data-hide="true">Vendida</button>
          <button type="button" data-delete="${card.id}">Excluir</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function renderLeads() {
  const leads = await getLeads();
  const tbody = document.querySelector("#admin-leads");

  tbody.innerHTML = leads.length ? leads.map(lead => `
    <tr>
      <td>${lead.nome || ""}</td>
      <td>${lead.whatsapp || ""}</td>
      <td>${lead.carta_resumo || lead.carta || ""}</td>
      <td>${lead.criado_em || lead.criadoEm ? new Date(lead.criado_em || lead.criadoEm).toLocaleString("pt-BR") : ""}</td>
    </tr>
  `).join("") : `<tr><td colspan="4">Nenhum lead salvo ainda.</td></tr>`;
}

async function refreshAdmin() {
  await renderCardsAdmin();
  await renderLeads();
}

function openAdmin() {
  const loginBox = document.querySelector("#admin-login");
  const adminPanel = document.querySelector("#admin-panel");

  sessionStorage.setItem("xc_admin_auth", "true");
  if (loginBox) loginBox.hidden = true;
  if (adminPanel) adminPanel.hidden = false;

  refreshAdmin();
}

function bindLogin() {
  const loginForm = document.querySelector("#login-form");
  if (!loginForm) return;

  const urlPassword = new URLSearchParams(window.location.search).get("password");
  if (urlPassword === ADMIN_PASSWORD) {
    history.replaceState({}, document.title, window.location.pathname);
    openAdmin();
    return;
  }

  if (sessionStorage.getItem("xc_admin_auth") === "true") {
    openAdmin();
    return;
  }

  loginForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const passwordInput = loginForm.querySelector('input[name="password"]');
    const password = passwordInput ? passwordInput.value.trim() : "";

    if (password === ADMIN_PASSWORD) {
      openAdmin();
    } else {
      alert("Senha incorreta.");
    }
  });

  const logout = document.querySelector("#logout");
  if (logout) {
    logout.addEventListener("click", () => {
      sessionStorage.removeItem("xc_admin_auth");
      location.reload();
    });
  }
}

function bindForm() {
  const form = document.querySelector("#card-form");
  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();

    try {
      const card = getFormCard();
      await saveCard(card);
      resetForm();
      await refreshAdmin();
      alert("Carta salva com sucesso.");
    } catch (error) {
      console.error(error);
      alert(`Erro ao salvar carta: ${error.message || "verifique as políticas do Supabase."}`);
    }
  });

  const cancel = document.querySelector("#cancel-edit");
  if (cancel) cancel.addEventListener("click", resetForm);
}

function bindTableActions() {
  document.addEventListener("click", async event => {
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");
    const statusButton = event.target.closest("[data-status]");

    if (editButton) {
      const cards = await getCards();
      const card = cards.find(item => String(item.id) === String(editButton.dataset.edit));
      if (card) fillForm(card);
    }

    if (deleteButton) {
      if (!confirm("Tem certeza que deseja excluir esta carta?")) return;

      try {
        await deleteCard(deleteButton.dataset.delete);
        await refreshAdmin();
      } catch (error) {
        console.error(error);
        alert(`Erro ao excluir carta: ${error.message || "verifique as políticas do Supabase."}`);
      }
    }

    if (statusButton) {
      try {
        const hide = statusButton.dataset.hide === "true" ? true : null;
        await updateStatus(statusButton.dataset.status, statusButton.dataset.newStatus, hide);
        await refreshAdmin();
      } catch (error) {
        console.error(error);
        alert(`Erro ao atualizar status: ${error.message || "verifique as políticas do Supabase."}`);
      }
    }
  });
}

function bindTools() {
  const reset = document.querySelector("#reset-data");
  if (reset) {
    reset.addEventListener("click", () => {
      alert("Agora as cartas vêm do Supabase. Para restaurar as cartas iniciais, use o SQL de insert no Supabase.");
    });
  }

  const exportButton = document.querySelector("#export-json");
  if (exportButton) {
    exportButton.addEventListener("click", async () => {
      const cards = await getCards();
      const blob = new Blob([JSON.stringify(cards, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "cartas-xcapital.json";
      link.click();
    });
  }
}


function initAdminMobileMenu() {
  const button = document.querySelector("[data-menu-button]");
  const nav = document.querySelector("[data-nav]");
  if (!button || !nav) return;
  button.addEventListener("click", () => nav.classList.toggle("open"));
}

document.addEventListener("DOMContentLoaded", () => {
  initAdminMobileMenu();
  initSupabase();
  bindLogin();
  bindForm();
  bindTableActions();
  bindTools();
});
