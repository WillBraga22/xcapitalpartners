const STORAGE_KEY = "xc_cartas_contempladas";
const LEADS_KEY = "xc_leads";

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

function getCards() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return getInitialCards();
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : getInitialCards();
  } catch (error) {
    return getInitialCards();
  }
}

function saveCards(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function getLeads() {
  const stored = localStorage.getItem(LEADS_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveLead(lead) {
  const leads = getLeads();
  leads.unshift({ ...lead, criadoEm: new Date().toISOString() });
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
}

function buildWhatsappLink(message) {
  return `https://wa.me/${window.XC_CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
}

function cardMessage(card) {
  return `Olá, vi no site da X Capital a carta contemplada de ${formatCurrency(card.credito)} com entrada de ${formatCurrency(card.entrada)}. Quero mais detalhes.`;
}

function renderFeaturedCards(limit = 3) {
  const target = document.querySelector("[data-featured-cards]");
  if (!target) return;
  const cards = getCards().filter(card => !card.ocultarPublico && card.status !== "Vendida").slice(0, limit);
  if (!cards.length) {
    target.innerHTML = `<p class="empty-state">Nenhuma carta disponível no momento.</p>`;
    return;
  }
  target.innerHTML = cards.map(renderCard).join("");
}

function renderCardsPage() {
  const target = document.querySelector("[data-cards-list]");
  if (!target) return;

  const cards = getCards();
  const filters = {
    search: document.querySelector("#search")?.value || "",
    tipo: document.querySelector("#tipo")?.value || "",
    status: document.querySelector("#status")?.value || "",
    creditoMax: document.querySelector("#creditoMax")?.value || "",
    entradaMax: document.querySelector("#entradaMax")?.value || "",
    parcelaMax: document.querySelector("#parcelaMax")?.value || ""
  };

  const filtered = cards.filter(card => {
    if (card.ocultarPublico) return false;
    if (!filters.status && card.status === "Vendida") return false;
    const text = normalizeText(`${card.tipo} ${card.administradora} ${card.uso} ${card.observacaoPublica}`);
    if (filters.search && !text.includes(normalizeText(filters.search))) return false;
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
  return `
    <article class="card-item">
      <div class="card-topline">
        <span class="chip">${card.tipo}</span>
        <span class="status ${statusClass}">${card.status}</span>
      </div>
      <h3>${card.administradora}</h3>
      <div class="price-grid">
        <div>
          <span>Crédito</span>
          <strong>${formatCurrency(card.credito)}</strong>
        </div>
        <div>
          <span>Entrada</span>
          <strong>${formatCurrency(card.entrada)}</strong>
        </div>
      </div>
      <div class="card-line">
        <span>Parcelas</span>
        <strong>${card.parcelas}</strong>
      </div>
      <div class="card-line">
        <span>Uso permitido</span>
        <strong>${card.uso}</strong>
      </div>
      ${card.observacaoPublica ? `<p class="note">${card.observacaoPublica}</p>` : ""}
      <div class="card-actions">
        <a class="button primary" href="${buildWhatsappLink(cardMessage(card))}" target="_blank" rel="noopener">Tenho interesse</a>
        <button class="button ghost" type="button" data-lead-card="${card.id}">Salvar interesse</button>
      </div>
      <p class="legal-small">Sujeito à disponibilidade, análise cadastral, confirmação das condições e aprovação da administradora.</p>
    </article>
  `;
}

function bindLeadButtons() {
  document.addEventListener("click", event => {
    const button = event.target.closest("[data-lead-card]");
    if (!button) return;
    const cards = getCards();
    const card = cards.find(item => item.id === button.dataset.leadCard);
    if (!card) return;
    const name = prompt("Qual seu nome?");
    if (!name) return;
    const whatsapp = prompt("Qual seu WhatsApp?");
    if (!whatsapp) return;
    saveLead({ nome: name, whatsapp, cartaId: card.id, carta: `${card.administradora} ${formatCurrency(card.credito)}`, status: "Novo" });
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
    sellForm.addEventListener("submit", event => {
      event.preventDefault();
      const formData = new FormData(sellForm);
      const message = `Olá, quero avaliar uma cota com a X Capital.\nNome: ${formData.get("nome")}\nWhatsApp: ${formData.get("whatsapp")}\nTipo: ${formData.get("tipo")}\nAdministradora: ${formData.get("administradora")}\nCrédito: ${formData.get("credito")}\nSituação: ${formData.get("situacao")}`;
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
  initMobileMenu();
  renderFeaturedCards();
  renderCardsPage();
  bindFilters();
  bindLeadButtons();
  bindForms();
});
