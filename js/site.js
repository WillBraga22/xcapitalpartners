const STORAGE_KEY = "xc_cartas_contempladas";
const LEADS_KEY = "xc_leads";
const SELL_LEADS_KEY = "xc_sell_leads";

let supabaseClient = null;

function initSupabase() {
  if (!window.supabase || !window.XC_SUPABASE_CONFIG) return null;
  const { url, anonKey } = window.XC_SUPABASE_CONFIG;
  if (!url || !anonKey) return null;
  supabaseClient = window.supabase.createClient(url, anonKey);
  return supabaseClient;
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalizeText(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getInitialCards() {
  return JSON.parse(JSON.stringify(window.XC_INITIAL_CARDS || []));
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
    ocultarPublico: Boolean(row.ocultar_publico)
  };
}

function toLeadRow(lead) {
  return {
    nome: lead.nome,
    whatsapp: lead.whatsapp,
    carta_id: lead.cartaId || null,
    carta_resumo: lead.carta || "",
    origem: "site",
    status: "Novo"
  };
}

function toSellLeadRow(formData) {
  return {
    nome: formData.get("nome"),
    whatsapp: formData.get("whatsapp"),
    email: formData.get("email") || null,
    tipo: formData.get("tipo"),
    administradora: formData.get("administradora") || null,
    credito: formData.get("credito") || null,
    situacao: formData.get("situacao") || null,
    observacao: formData.get("observacao") || null,
    origem: "site",
    status: "Novo"
  };
}

function getCardsLocal() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return getInitialCards();
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : getInitialCards();
  } catch (error) {
    return getInitialCards();
  }
}

async function getCards() {
  if (supabaseClient) {
    const { data, error } = await supabaseClient
      .from("cartas")
      .select("*")
      .order("criado_em", { ascending: false });

    if (!error && Array.isArray(data)) return data.map(toCard);
    console.warn("Erro ao buscar cartas no Supabase. Usando dados locais.", error);
  }

  return getCardsLocal();
}

function getLeadsLocal() {
  const stored = localStorage.getItem(LEADS_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

async function saveLead(lead) {
  if (supabaseClient) {
    const { error } = await supabaseClient.from("leads").insert(toLeadRow(lead));
    if (!error) return;
    console.warn("Erro ao salvar lead no Supabase. Salvando localmente.", error);
  }

  const leads = getLeadsLocal();
  leads.unshift({ ...lead, criadoEm: new Date().toISOString() });
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
}

async function saveSellLead(formData) {
  const row = toSellLeadRow(formData);
  if (supabaseClient) {
    const { error } = await supabaseClient.from("cotas_venda").insert(row);
    if (!error) return;
    console.warn("Erro ao salvar avaliação de cota no Supabase. Salvando localmente.", error);
  }

  const stored = localStorage.getItem(SELL_LEADS_KEY);
  const leads = stored ? JSON.parse(stored) : [];
  leads.unshift({ ...row, criado_em: new Date().toISOString() });
  localStorage.setItem(SELL_LEADS_KEY, JSON.stringify(leads));
}

function buildWhatsappLink(message) {
  return `https://wa.me/${window.XC_CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
}

function cardMessage(card) {
  return `Olá, vi no site da X Capital a carta contemplada de ${formatCurrency(card.credito)} com entrada de ${formatCurrency(card.entrada)}. Quero mais detalhes.`;
}

function cardDetailLink(card) {
  return `carta.html?id=${encodeURIComponent(card.id)}`;
}

async function renderFeaturedCards(limit = 3) {
  const target = document.querySelector("[data-featured-cards]");
  if (!target) return;
  target.innerHTML = `<p class="empty-state">Carregando cartas...</p>`;

  const cards = (await getCards())
    .filter(card => !card.ocultarPublico && !["Vendida", "Arquivada"].includes(card.status))
    .slice(0, limit);

  if (!cards.length) {
    target.innerHTML = `<p class="empty-state">Nenhuma carta disponível no momento.</p>`;
    return;
  }

  target.innerHTML = cards.map(renderCard).join("");
}

async function renderCardsPage() {
  const target = document.querySelector("[data-cards-list]");
  if (!target) return;
  target.innerHTML = `<p class="empty-state">Carregando cartas...</p>`;

  const cards = await getCards();
  const filters = {
    search: document.querySelector("#search")?.value || "",
    administradora: document.querySelector("#administradora")?.value || "",
    tipo: document.querySelector("#tipo")?.value || "",
    status: document.querySelector("#status")?.value || "",
    creditoMax: document.querySelector("#creditoMax")?.value || "",
    entradaMax: document.querySelector("#entradaMax")?.value || "",
    parcelaMax: document.querySelector("#parcelaMax")?.value || ""
  };

  const filtered = cards.filter(card => {
    if (card.ocultarPublico) return false;
    if (!filters.status && ["Vendida", "Arquivada"].includes(card.status)) return false;
    const text = normalizeText(`${card.tipo} ${card.administradora} ${card.uso} ${card.observacaoPublica}`);
    if (filters.search && !text.includes(normalizeText(filters.search))) return false;
    if (filters.administradora && !normalizeText(card.administradora).includes(normalizeText(filters.administradora))) return false;
    if (filters.tipo && card.tipo !== filters.tipo) return false;
    if (filters.status && card.status !== filters.status) return false;
    if (filters.creditoMax && Number(card.credito) > Number(filters.creditoMax)) return false;
    if (filters.entradaMax && Number(card.entrada) > Number(filters.entradaMax)) return false;
    if (filters.parcelaMax && Number(card.parcelaBusca || 0) > Number(filters.parcelaMax)) return false;
    return true;
  });

  const count = document.querySelector("[data-card-count]");
  if (count) count.textContent = `${filtered.length} carta${filtered.length === 1 ? "" : "s"} encontrada${filtered.length === 1 ? "" : "s"}`;

  target.innerHTML = filtered.length
    ? filtered.map(renderCard).join("")
    : `<p class="empty-state">Nenhuma carta encontrada com esses filtros.</p>`;
}

function renderCard(card) {
  const statusClass = normalizeText(card.status).replace(/\s+/g, "-");
  const reservedClass = card.status === "Reservada" ? " highlight-reserved" : "";
  return `
    <article class="card-item${reservedClass}">
      <div class="card-topline">
        <span class="chip">${card.tipo}</span>
        <span class="status ${statusClass}">${card.status}</span>
      </div>
      <h3>${card.administradora}</h3>
      <div class="price-grid">
        <div><span>Crédito</span><strong>${formatCurrency(card.credito)}</strong></div>
        <div><span>Entrada</span><strong>${formatCurrency(card.entrada)}</strong></div>
      </div>
      <div class="card-line"><span>Parcelas</span><strong>${card.parcelas}</strong></div>
      <div class="card-line"><span>Uso permitido</span><strong>${card.uso}</strong></div>
      ${card.observacaoPublica ? `<p class="note">${card.observacaoPublica}</p>` : ""}
      <div class="card-actions">
        <a class="button primary" href="${buildWhatsappLink(cardMessage(card))}" target="_blank" rel="noopener">Consultar disponibilidade</a>
        <a class="button ghost" href="${cardDetailLink(card)}">Ver detalhes</a>
        <button class="button ghost" type="button" data-lead-card="${card.id}">Salvar interesse</button>
      </div>
      <p class="legal-small">Sujeito à disponibilidade, análise cadastral, confirmação das condições e aprovação da administradora.</p>
    </article>
  `;
}

async function renderCardDetailPage() {
  const target = document.querySelector("[data-card-detail]");
  if (!target) return;
  const id = new URLSearchParams(window.location.search).get("id");
  const cards = await getCards();
  const card = cards.find(item => String(item.id) === String(id));

  if (!card || card.ocultarPublico || ["Vendida", "Arquivada"].includes(card.status)) {
    target.innerHTML = `<p class="empty-state">Carta não encontrada ou indisponível no momento.</p>`;
    return;
  }

  const statusClass = normalizeText(card.status).replace(/\s+/g, "-");
  target.innerHTML = `
    <div class="detail-shell">
      <article class="detail-panel">
        <div class="detail-title-row">
          <div>
            <span class="chip">${card.tipo}</span>
            <h2 style="margin-top:14px;">${card.administradora}</h2>
          </div>
          <span class="status ${statusClass}">${card.status}</span>
        </div>
        <div class="detail-list">
          <div><span>Crédito</span><strong>${formatCurrency(card.credito)}</strong></div>
          <div><span>Entrada</span><strong>${formatCurrency(card.entrada)}</strong></div>
          <div><span>Parcelas</span><strong>${card.parcelas}</strong></div>
          <div><span>Uso permitido</span><strong>${card.uso}</strong></div>
          ${card.observacaoPublica ? `<div><span>Observação</span><strong>${card.observacaoPublica}</strong></div>` : ""}
        </div>
        <p class="legal-small">Valores, disponibilidade e condições sujeitos à confirmação, análise cadastral, garantias e aprovação da administradora.</p>
      </article>
      <aside class="detail-panel">
        <h3>Interessado nessa carta?</h3>
        <p class="note">Fale com a X Capital para confirmar se essa oportunidade ainda está disponível e entender os próximos passos.</p>
        <div class="card-actions">
          <a class="button primary" href="${buildWhatsappLink(cardMessage(card))}" target="_blank" rel="noopener">Chamar no WhatsApp</a>
          <button class="button ghost" type="button" data-lead-card="${card.id}">Salvar interesse</button>
        </div>
      </aside>
    </div>`;
}

function bindLeadButtons() {
  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-lead-card]");
    if (!button) return;

    const cards = await getCards();
    const card = cards.find(item => String(item.id) === String(button.dataset.leadCard));
    if (!card) return;

    const name = prompt("Qual seu nome?");
    if (!name) return;

    const whatsapp = prompt("Qual seu WhatsApp?");
    if (!whatsapp) return;

    await saveLead({ nome: name, whatsapp, cartaId: card.id, carta: `${card.administradora} ${formatCurrency(card.credito)}`, status: "Novo" });
    window.open(buildWhatsappLink(cardMessage(card)), "_blank");
  });
}

function bindFilters() {
  const filterInputs = document.querySelectorAll("[data-filter]");
  filterInputs.forEach(input => input.addEventListener("input", renderCardsPage));
  const clearButton = document.querySelector("[data-clear-filters]");
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      filterInputs.forEach(input => input.value = "");
      renderCardsPage();
    });
  }
}

function bindForms() {
  const sellForm = document.querySelector("#sell-form");
  if (sellForm) {
    sellForm.addEventListener("submit", async event => {
      event.preventDefault();
      const formData = new FormData(sellForm);
      await saveSellLead(formData);
      const feedback = document.querySelector("#sell-feedback");
      if (feedback) feedback.hidden = false;
      const message = `Olá, quero avaliar uma cota com a X Capital.\nNome: ${formData.get("nome")}\nWhatsApp: ${formData.get("whatsapp")}\nTipo: ${formData.get("tipo")}\nAdministradora: ${formData.get("administradora")}\nCrédito: ${formData.get("credito")}\nSituação: ${formData.get("situacao")}\nObservação: ${formData.get("observacao") || ""}`;
      window.open(buildWhatsappLink(message), "_blank");
      sellForm.reset();
    });
  }

  const contactForm = document.querySelector("#contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", event => {
      event.preventDefault();
      const formData = new FormData(contactForm);
      const message = `Olá, vim pelo site da X Capital.\nNome: ${formData.get("nome")}\nWhatsApp: ${formData.get("whatsapp")}\nObjetivo: ${formData.get("objetivo")}\nMensagem: ${formData.get("mensagem")}`;
      window.open(buildWhatsappLink(message), "_blank");
      contactForm.reset();
    });
  }
}

function initMobileMenu() {
  const button = document.querySelector("[data-menu-button]");
  const nav = document.querySelector("[data-nav]");
  if (!button || !nav) return;
  button.addEventListener("click", () => nav.classList.toggle("open"));
}

document.addEventListener("DOMContentLoaded", () => {
  initSupabase();
  initMobileMenu();
  renderFeaturedCards();
  renderCardsPage();
  renderCardDetailPage();
  bindFilters();
  bindLeadButtons();
  bindForms();
});
