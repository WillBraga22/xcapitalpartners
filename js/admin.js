const ADMIN_CODE = "4045";
const ADMIN_PASSWORD = "xcapital4045";
const STORAGE_KEY = "xc_cartas_contempladas";
const LEADS_KEY = "xc_leads";
const SELL_LEADS_KEY = "xc_sell_leads";

let editingId = null;
let supabaseClient = null;
let adminCardsCache = [];
let adminLeadsCache = [];
let adminSellCache = [];

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

function normalizeText(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseMoney(value) {
  if (value === null || value === undefined || value === "") return null;
  const clean = String(value).replace(/[R$\s.]/g, "").replace(",", ".");
  const number = Number(clean);
  return Number.isFinite(number) ? number : null;
}

function buildWhatsappLink(message) {
  return `https://wa.me/${window.XC_CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
}

function personWhatsappLink(phone, message = "Olá, vim pelo site da X Capital.") {
  const clean = String(phone || "").replace(/\D/g, "");
  const withCountry = clean.startsWith("55") ? clean : `55${clean}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
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
    observacaoInterna: row.observacao_interna || "",
    criadoEm: row.criado_em || "",
    atualizadoEm: row.atualizado_em || ""
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
    ocultar_publico: Boolean(card.ocultarPublico || ["Vendida", "Arquivada"].includes(card.status)),
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
  try { const parsed = JSON.parse(stored); return Array.isArray(parsed) ? parsed : getInitialCards(); } catch { return getInitialCards(); }
}

async function getCards() {
  if (supabaseClient) {
    const result = await supabaseClient.from("cartas").select("*").order("criado_em", { ascending: false });
    if (!result.error && Array.isArray(result.data)) return result.data.map(toCard);
    console.error("Erro ao buscar cartas no Supabase:", result.error);
    alert("Erro ao buscar cartas no Supabase. Confira se o SQL v6 foi executado.");
  }
  return getCardsLocal();
}

function saveCardsLocal(cards) { localStorage.setItem(STORAGE_KEY, JSON.stringify(cards)); }

async function saveCard(card) {
  if (supabaseClient) {
    const payload = toCardRow(card);
    const result = editingId
      ? await supabaseClient.from("cartas").update(payload).eq("id", editingId)
      : await supabaseClient.from("cartas").insert(payload);
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

async function updateCard(id, payload) {
  if (supabaseClient) {
    const result = await supabaseClient.from("cartas").update({ ...payload, atualizado_em: new Date().toISOString() }).eq("id", id);
    if (result.error) throw result.error;
    return;
  }
  const cards = getCardsLocal().map(card => card.id === id ? { ...card, ...payload } : card);
  saveCardsLocal(cards);
}

async function updateStatus(id, status, ocultarPublico = null) {
  const payload = { status };
  if (ocultarPublico !== null) payload.ocultar_publico = ocultarPublico;
  if (status === "Vendida" || status === "Arquivada") payload.ocultar_publico = true;
  if (status === "Disponível" || status === "Reservada") payload.ocultar_publico = false;
  await updateCard(id, payload);
}

async function getLeads() {
  if (supabaseClient) {
    const result = await supabaseClient.from("leads").select("*").order("criado_em", { ascending: false });
    if (!result.error && Array.isArray(result.data)) return result.data;
    console.warn("Erro ao buscar leads:", result.error);
  }
  const stored = localStorage.getItem(LEADS_KEY);
  if (!stored) return [];
  try { const parsed = JSON.parse(stored); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

async function updateLead(id, payload) {
  if (!id) return;
  if (supabaseClient) {
    const result = await supabaseClient.from("leads").update(payload).eq("id", id);
    if (result.error) throw result.error;
    return;
  }
}

async function getSellLeads() {
  if (supabaseClient) {
    const result = await supabaseClient.from("cotas_venda").select("*").order("criado_em", { ascending: false });
    if (!result.error && Array.isArray(result.data)) return result.data;
    console.warn("Erro ao buscar cotas para avaliação. Rode o SQL v6 se ainda não rodou.", result.error);
  }
  const stored = localStorage.getItem(SELL_LEADS_KEY);
  if (!stored) return [];
  try { const parsed = JSON.parse(stored); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

async function updateSellLead(id, payload) {
  if (!id) return;
  if (supabaseClient) {
    const result = await supabaseClient.from("cotas_venda").update(payload).eq("id", id);
    if (result.error) throw result.error;
  }
}

function getFormCard() {
  const form = document.querySelector("#card-form");
  const formData = new FormData(form);
  return {
    tipo: formData.get("tipo"), administradora: formData.get("administradora"), credito: parseMoney(formData.get("credito")) || 0,
    entrada: parseMoney(formData.get("entrada")) || 0, parcelas: formData.get("parcelas"), parcelaBusca: parseMoney(formData.get("parcelaBusca")) || 0,
    status: formData.get("status"), uso: formData.get("uso"), observacaoPublica: formData.get("observacaoPublica"), ocultarPublico: formData.get("ocultarPublico") === "on",
    nomeDono: formData.get("nomeDono"), telefoneDono: formData.get("telefoneDono"), grupo: formData.get("grupo"), cota: formData.get("cota"),
    valorCompra: formData.get("valorCompra"), comissao: formData.get("comissao"), responsavel: formData.get("responsavel"), documentos: formData.get("documentos"), observacaoInterna: formData.get("observacaoInterna")
  };
}

function fillForm(card) {
  const form = document.querySelector("#card-form");
  const fields = { tipo: card.tipo, administradora: card.administradora, credito: card.credito, entrada: card.entrada, parcelas: card.parcelas, parcelaBusca: card.parcelaBusca, status: card.status, uso: card.uso, observacaoPublica: card.observacaoPublica, nomeDono: card.nomeDono, telefoneDono: card.telefoneDono, grupo: card.grupo, cota: card.cota, valorCompra: card.valorCompra, comissao: card.comissao, responsavel: card.responsavel, documentos: card.documentos, observacaoInterna: card.observacaoInterna };
  Object.entries(fields).forEach(([name, value]) => { const input = form.elements[name]; if (input) input.value = value ?? ""; });
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
  const archived = cards.filter(card => card.status === "Arquivada").length;
  target.innerHTML = `
    <div><strong>${cards.length}</strong><span>cartas totais</span></div>
    <div><strong>${available}</strong><span>disponíveis</span></div>
    <div><strong>${reserved}</strong><span>reservadas</span></div>
    <div><strong>${sold}</strong><span>vendidas</span></div>
    <div><strong>${archived}</strong><span>arquivadas</span></div>`;
}

function filterCardsForAdmin(cards) {
  const search = normalizeText(document.querySelector("#admin-card-search")?.value || "");
  const status = document.querySelector("#admin-card-status")?.value || "";
  return cards.filter(card => {
    const text = normalizeText(`${card.administradora} ${card.tipo} ${card.uso} ${card.responsavel} ${card.nomeDono}`);
    if (search && !text.includes(search)) return false;
    if (status && card.status !== status) return false;
    return true;
  });
}

async function renderCardsAdmin() {
  adminCardsCache = await getCards();
  renderSummary(adminCardsCache);
  const cards = filterCardsForAdmin(adminCardsCache);
  const tbody = document.querySelector("#admin-cards");
  tbody.innerHTML = cards.length ? cards.map(card => `
    <tr>
      <td><strong>${card.administradora}</strong><br><small>${card.tipo} | ${card.uso || "Sem uso informado"}<br>Responsável: ${card.responsavel || "não informado"}</small></td>
      <td>${formatCurrency(card.credito)}</td>
      <td>${formatCurrency(card.entrada)}</td>
      <td>${card.parcelas}</td>
      <td>${card.status}</td>
      <td>${card.ocultarPublico ? "Oculta" : "Visível"}</td>
      <td><div class="table-actions">
        <button type="button" data-edit="${card.id}">Editar</button>
        <button type="button" data-status="${card.id}" data-new-status="Disponível">Disponível</button>
        <button type="button" data-status="${card.id}" data-new-status="Reservada">Reservar</button>
        <button type="button" data-status="${card.id}" data-new-status="Vendida">Vendida</button>
        <button type="button" data-status="${card.id}" data-new-status="Arquivada">Arquivar</button>
      </div></td>
    </tr>`).join("") : `<tr><td colspan="7">Nenhuma carta encontrada.</td></tr>`;
}

function filterLeads(leads) {
  const search = normalizeText(document.querySelector("#admin-lead-search")?.value || "");
  const status = document.querySelector("#admin-lead-status")?.value || "";
  return leads.filter(lead => {
    const text = normalizeText(`${lead.nome} ${lead.whatsapp} ${lead.carta_resumo} ${lead.responsavel}`);
    if (search && !text.includes(search)) return false;
    if (status && (lead.status || "Novo") !== status) return false;
    return true;
  });
}

async function renderLeads() {
  adminLeadsCache = await getLeads();
  const leads = filterLeads(adminLeadsCache);
  const tbody = document.querySelector("#admin-leads");
  tbody.innerHTML = leads.length ? leads.map(lead => `
    <tr>
      <td><strong>${lead.nome || ""}</strong><br><small>${lead.whatsapp || ""}</small></td>
      <td>${lead.carta_resumo || lead.carta || ""}</td>
      <td>${lead.criado_em || lead.criadoEm ? new Date(lead.criado_em || lead.criadoEm).toLocaleString("pt-BR") : ""}</td>
      <td><div class="inline-edit">
        <select data-lead-status="${lead.id}"><option ${(!lead.status || lead.status === "Novo") ? "selected" : ""}>Novo</option><option ${lead.status === "Em atendimento" ? "selected" : ""}>Em atendimento</option><option ${lead.status === "Aguardando retorno" ? "selected" : ""}>Aguardando retorno</option><option ${lead.status === "Negociação avançada" ? "selected" : ""}>Negociação avançada</option><option ${lead.status === "Fechado" ? "selected" : ""}>Fechado</option><option ${lead.status === "Perdido" ? "selected" : ""}>Perdido</option></select>
        <input data-lead-responsavel="${lead.id}" value="${lead.responsavel || ""}" placeholder="Responsável">
      </div></td>
      <td><div class="table-actions"><button type="button" data-save-lead="${lead.id}">Salvar</button><a class="button ghost" href="${personWhatsappLink(lead.whatsapp, `Olá, ${lead.nome || ""}. Vi seu interesse pelo site da X Capital e quero te passar mais detalhes.`)}" target="_blank" rel="noopener">WhatsApp</a></div></td>
    </tr>`).join("") : `<tr><td colspan="5">Nenhum lead encontrado.</td></tr>`;
}

function filterSellLeads(leads) {
  const search = normalizeText(document.querySelector("#admin-sell-search")?.value || "");
  const status = document.querySelector("#admin-sell-status")?.value || "";
  return leads.filter(lead => {
    const text = normalizeText(`${lead.nome} ${lead.whatsapp} ${lead.administradora} ${lead.tipo} ${lead.credito}`);
    if (search && !text.includes(search)) return false;
    if (status && (lead.status || "Novo") !== status) return false;
    return true;
  });
}

async function renderSellLeads() {
  adminSellCache = await getSellLeads();
  const leads = filterSellLeads(adminSellCache);
  const tbody = document.querySelector("#admin-sell-leads");
  if (!tbody) return;
  tbody.innerHTML = leads.length ? leads.map(lead => `
    <tr>
      <td><strong>${lead.nome || ""}</strong><br><small>${lead.whatsapp || ""}<br>${lead.email || ""}</small></td>
      <td><strong>${lead.administradora || "Não informada"}</strong><br><small>${lead.tipo || ""} | ${lead.credito || ""}<br>${lead.observacao || ""}</small></td>
      <td>${lead.situacao || ""}</td>
      <td>${lead.criado_em ? new Date(lead.criado_em).toLocaleString("pt-BR") : ""}</td>
      <td><select data-sell-status="${lead.id}"><option ${(!lead.status || lead.status === "Novo") ? "selected" : ""}>Novo</option><option ${lead.status === "Em análise" ? "selected" : ""}>Em análise</option><option ${lead.status === "Viável" ? "selected" : ""}>Viável</option><option ${lead.status === "Sem perfil" ? "selected" : ""}>Sem perfil</option><option ${lead.status === "Convertida em carta" ? "selected" : ""}>Convertida em carta</option></select></td>
      <td><div class="table-actions"><button type="button" data-save-sell="${lead.id}">Salvar</button><a class="button ghost" href="${personWhatsappLink(lead.whatsapp, `Olá, ${lead.nome || ""}. Recebi sua solicitação para avaliar sua cota pela X Capital.`)}" target="_blank" rel="noopener">WhatsApp</a></div></td>
    </tr>`).join("") : `<tr><td colspan="6">Nenhuma cota para avaliação encontrada. Se já existem formulários enviados, rode o SQL v6.</td></tr>`;
}

async function refreshAdmin() {
  await renderCardsAdmin();
  await renderLeads();
  await renderSellLeads();
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
  const params = new URLSearchParams(window.location.search);
  const urlCode = params.get("codigo") || params.get("code") || params.get("accessCode");
  const urlPassword = params.get("password") || params.get("senha");
  if (urlCode === ADMIN_CODE && urlPassword === ADMIN_PASSWORD) { history.replaceState({}, document.title, window.location.pathname); openAdmin(); return; }
  if (sessionStorage.getItem("xc_admin_auth") === "true") { openAdmin(); return; }
  loginForm.addEventListener("submit", function(event) {
    event.preventDefault();
    const accessCode = loginForm.querySelector('input[name="accessCode"]')?.value.trim() || "";
    const password = loginForm.querySelector('input[name="password"]')?.value.trim() || "";
    if (accessCode === ADMIN_CODE && password === ADMIN_PASSWORD) openAdmin(); else alert("Código de acesso ou senha incorretos.");
  });
  const logout = document.querySelector("#logout");
  if (logout) logout.addEventListener("click", () => { sessionStorage.removeItem("xc_admin_auth"); location.reload(); });
}

function bindForm() {
  const form = document.querySelector("#card-form");
  if (!form) return;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    try { const card = getFormCard(); await saveCard(card); resetForm(); await refreshAdmin(); alert("Carta salva com sucesso."); }
    catch (error) { console.error(error); alert(`Erro ao salvar carta: ${error.message || "verifique as políticas do Supabase."}`); }
  });
  const cancel = document.querySelector("#cancel-edit");
  if (cancel) cancel.addEventListener("click", resetForm);
}

function bindTableActions() {
  document.addEventListener("click", async event => {
    const editButton = event.target.closest("[data-edit]");
    const statusButton = event.target.closest("[data-status]");
    const saveLeadButton = event.target.closest("[data-save-lead]");
    const saveSellButton = event.target.closest("[data-save-sell]");

    if (editButton) { const card = adminCardsCache.find(item => String(item.id) === String(editButton.dataset.edit)); if (card) fillForm(card); }
    if (statusButton) {
      try { await updateStatus(statusButton.dataset.status, statusButton.dataset.newStatus); await refreshAdmin(); }
      catch (error) { console.error(error); alert(`Erro ao atualizar status: ${error.message || "verifique as políticas do Supabase."}`); }
    }
    if (saveLeadButton) {
      const id = saveLeadButton.dataset.saveLead;
      const status = document.querySelector(`[data-lead-status="${CSS.escape(id)}"]`)?.value || "Novo";
      const responsavel = document.querySelector(`[data-lead-responsavel="${CSS.escape(id)}"]`)?.value || "";
      try { await updateLead(id, { status, responsavel }); await refreshAdmin(); }
      catch (error) { console.error(error); alert(`Erro ao salvar lead: ${error.message || "rode o SQL v6."}`); }
    }
    if (saveSellButton) {
      const id = saveSellButton.dataset.saveSell;
      const status = document.querySelector(`[data-sell-status="${CSS.escape(id)}"]`)?.value || "Novo";
      try { await updateSellLead(id, { status }); await refreshAdmin(); }
      catch (error) { console.error(error); alert(`Erro ao salvar avaliação: ${error.message || "rode o SQL v6."}`); }
    }
  });
}

function bindFilters() {
  const cardSearch = document.querySelector("#admin-card-search");
  const cardStatus = document.querySelector("#admin-card-status");
  const leadSearch = document.querySelector("#admin-lead-search");
  const leadStatus = document.querySelector("#admin-lead-status");
  const sellSearch = document.querySelector("#admin-sell-search");
  const sellStatus = document.querySelector("#admin-sell-status");
  cardSearch?.addEventListener("input", renderCardsAdmin); cardStatus?.addEventListener("input", renderCardsAdmin);
  leadSearch?.addEventListener("input", renderLeads); leadStatus?.addEventListener("input", renderLeads);
  sellSearch?.addEventListener("input", renderSellLeads); sellStatus?.addEventListener("input", renderSellLeads);
  document.querySelector("#admin-card-clear")?.addEventListener("click", () => { cardSearch.value = ""; cardStatus.value = ""; renderCardsAdmin(); });
  document.querySelector("#admin-lead-clear")?.addEventListener("click", () => { leadSearch.value = ""; leadStatus.value = ""; renderLeads(); });
  document.querySelector("#admin-sell-clear")?.addEventListener("click", () => { sellSearch.value = ""; sellStatus.value = ""; renderSellLeads(); });
}

function bindTools() {
  const reset = document.querySelector("#reset-data");
  if (reset) reset.addEventListener("click", () => alert("Agora as cartas vêm do Supabase. Para restaurar cartas iniciais, use o SQL no Supabase."));
  const exportButton = document.querySelector("#export-json");
  if (exportButton) exportButton.addEventListener("click", async () => {
    const payload = { cartas: await getCards(), leads: await getLeads(), cotas_venda: await getSellLeads() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "xcapital-export.json"; link.click();
  });
}

function initAdminMobileMenu() {
  const button = document.querySelector("[data-menu-button]"); const nav = document.querySelector("[data-nav]");
  if (!button || !nav) return; button.addEventListener("click", () => nav.classList.toggle("open"));
}

document.addEventListener("DOMContentLoaded", () => {
  initAdminMobileMenu(); initSupabase(); bindLogin(); bindForm(); bindTableActions(); bindFilters(); bindTools();
});
