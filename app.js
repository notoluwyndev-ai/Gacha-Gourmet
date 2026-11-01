(() => {
  const { config, cards } = window.GACHA_DATA;
  const rarityNames = { comun: "Común", rara: "Rara", ultra: "Ultra rara" };
  const storageKey = "gacha-gourmet-save-v1";
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const elements = {
    albumGrid: document.querySelector("#album-grid"),
    albumProgressBar: document.querySelector("#album-progress-bar"),
    albumProgressLabel: document.querySelector("#album-progress-label"),
    albumSummary: document.querySelector("#album-summary"),
    collectionCount: document.querySelector("#collection-count"),
    coinCount: document.querySelector("#coin-count"),
    fatalError: document.querySelector("#fatal-error"),
    gameMessage: document.querySelector("#game-message"),
    odds: document.querySelector("#pack-odds"),
    pityNote: document.querySelector("#pity-note"),
    ownedOnly: document.querySelector("#owned-only"),
    rarityFilter: document.querySelector("#rarity-filter"),
    packArea: document.querySelector("#pack-area")
  };
  let activeScreen = "packs";
  let activeCategory = "Todas";
  let messageTimer;

  function defaultState() {
    return { coins: config.initialCoins, inventory: {}, pack: null, pity: 0 };
  }

  function normalizePack(pack) {
    if (!pack || typeof pack !== "object") return null;
    if (!pack.opened) return { opened: false, cardIds: [], revealed: 0 };
    const cardIds = Array.isArray(pack.cardIds) ? pack.cardIds.filter((id) => cardsById.has(id)) : [];
    if (cardIds.length !== config.cardsPerPack) return null;
    const revealed = Number.isInteger(pack.revealed) ? Math.min(Math.max(pack.revealed, 0), cardIds.length) : 0;
    return { opened: true, cardIds, revealed };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved || typeof saved !== "object") return defaultState();
      const inventory = {};
      for (const card of cards) {
        const quantity = saved.inventory?.[card.id];
        if (Number.isInteger(quantity) && quantity > 0) inventory[card.id] = quantity;
      }
      return {
        coins: Number.isInteger(saved.coins) && saved.coins >= 0 ? saved.coins : config.initialCoins,
        inventory,
        pack: normalizePack(saved.pack),
        pity: Number.isInteger(saved.pity) && saved.pity >= 0 ? saved.pity : 0
      };
    } catch {
      return defaultState();
    }
  }

  let state = loadState();

  function validateCatalog() {
    const oddsEntries = Object.entries(config.odds);
    const oddsTotal = oddsEntries.reduce((sum, [, odds]) => sum + odds, 0);
    if (oddsEntries.some(([, odds]) => !Number.isFinite(odds) || odds < 0 || odds > 100)) {
      return "Cada probabilidad debe ser un número entre 0 y 100.";
    }
    if (oddsTotal !== 100) return "Las probabilidades deben sumar exactamente 100 %.";
    if (!Number.isInteger(config.cardsPerPack) || config.cardsPerPack < 1 ||
        !Number.isFinite(config.packPrice) || config.packPrice < 0 ||
        !Number.isFinite(config.initialCoins) || config.initialCoins < 0) {
      return "Revisa el coste, las monedas iniciales y el contenido del sobre.";
    }
    if (!cards.length) return "Añade al menos una carta al catálogo.";
    if (cardsById.size !== cards.length) return "Cada carta necesita un identificador único.";
    if (oddsEntries.some(([rarity]) => !cards.some((card) => card.rarity === rarity))) {
      return "Cada rareza con probabilidad debe tener al menos una carta.";
    }
    if (cards.some((card) => !card.id || !card.name || !card.category || !rarityNames[card.rarity])) {
      return "Hay una carta con datos incompletos o una rareza desconocida.";
    }
    if (cards.some((card) => !Object.hasOwn(config.odds, card.rarity))) {
      return "Todas las cartas deben pertenecer a una rareza configurada en las probabilidades.";
    }
    if (config.pity) {
      if (!Object.hasOwn(config.odds, config.pity.rarity)) {
        return "La rareza del sistema de garantía (pity) debe existir en las probabilidades.";
      }
      if (!Number.isInteger(config.pity.threshold) || config.pity.threshold < 1) {
        return "El umbral del sistema de garantía (pity) debe ser un entero positivo.";
      }
    }
    return "";
  }

  function saveState() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      showMessage("No se pudo guardar la partida en este navegador.");
    }
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
    })[character]);
  }

  function showMessage(message) {
    elements.gameMessage.textContent = message;
    elements.gameMessage.classList.add("is-visible");
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => elements.gameMessage.classList.remove("is-visible"), 2600);
  }

  function pickFromRarity(rarity) {
    const pool = cards.filter((card) => card.rarity === rarity);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function rollRarity() {
    const roll = Math.random() * 100;
    let threshold = 0;
    let rarity = Object.keys(config.odds).at(-1);
    for (const [candidate, chance] of Object.entries(config.odds)) {
      threshold += chance;
      if (roll < threshold) {
        rarity = candidate;
        break;
      }
    }
    return rarity;
  }

  function drawCard() {
    // Sistema de garantía (pity): si llevamos `threshold - 1` cartas seguidas
    // sin la rareza protegida, esta tirada la fuerza, sin tocar las probabilidades base.
    if (config.pity && state.pity >= config.pity.threshold - 1) {
      state.pity = 0;
      return pickFromRarity(config.pity.rarity);
    }
    const rarity = rollRarity();
    if (config.pity) {
      state.pity = rarity === config.pity.rarity ? 0 : state.pity + 1;
    }
    return pickFromRarity(rarity);
  }

  function getCounts() {
    const ownedIds = Object.keys(state.inventory).filter((id) => state.inventory[id] > 0);
    const total = Object.values(state.inventory).reduce((sum, quantity) => sum + quantity, 0);
    return { unique: ownedIds.length, total };
  }

  function renderHeader() {
    const counts = getCounts();
    elements.coinCount.textContent = state.coins.toLocaleString("es");
    elements.collectionCount.textContent = `${counts.unique}/${cards.length}`;
  }

  function renderOdds() {
    elements.odds.innerHTML = Object.entries(config.odds).map(([rarity, chance]) => `
      <div class="odds-row">
        <span class="rarity-dot rarity-${escapeHTML(rarity)}"></span>
        <span>${escapeHTML(rarityNames[rarity])}</span>
        <strong>${chance}%</strong>
      </div>`).join("");
    if (config.pity) {
      const streakLimit = config.pity.threshold - 1;
      const streak = Math.min(state.pity, streakLimit);
      elements.pityNote.textContent = streak >= streakLimit
        ? `¡La próxima carta es ${rarityNames[config.pity.rarity]} garantizada!`
        : `Cartas sin ${rarityNames[config.pity.rarity]}: ${streak}/${streakLimit} · la siguiente está garantizada al llegar a ${streakLimit}`;
      elements.pityNote.hidden = false;
    } else {
      elements.pityNote.hidden = true;
    }
  }

  function renderPack() {
    if (!state.pack) {
      const canAfford = state.coins >= config.packPrice;
      const shortfall = config.packPrice - state.coins;
      elements.packArea.innerHTML = `
        <div class="shop-layout">
          <div class="pack-illustration" aria-hidden="true"><div class="pack-seal"><span>✦</span><small>MENÚ<br>SECRETO</small></div></div>
          <div class="pack-copy">
            <p class="eyebrow">SOBRE SORPRESA</p>
            <h2>¿Qué se cocina?</h2>
            <p>Un menú nuevo cabe en la palma de tu mano.</p>
            <div class="pack-specs"><span><b>3</b> cartas por sobre</span><span><b>30</b> monedas</span></div>
            <button class="primary-button" type="button" data-action="buy-pack" ${canAfford && !catalogError ? "" : "disabled"}>Comprar sobre <span aria-hidden="true">·</span> ${config.packPrice} monedas</button>
            ${canAfford ? "" : `<p class="insufficient">Te faltan ${shortfall} monedas.</p>`}
          </div>
        </div>`;
      return;
    }

    if (!state.pack.opened) {
      elements.packArea.innerHTML = `
        <div class="pending-pack">
          <div class="pack-illustration" aria-hidden="true"><div class="pack-seal"><span>✦</span><small>MENÚ</small></div></div>
          <h2>Sobre en mano</h2>
          <p>Ya es tuyo. ¿Listo para descubrir el menú?</p>
          <button class="primary-button" type="button" data-action="open-pack">Romper el sello</button>
        </div>`;
      return;
    }

    if (state.pack.revealed >= state.pack.cardIds.length) {
      const summaryCards = state.pack.cardIds.map((id) => {
        const card = cardsById.get(id);
        return cardMarkup(card, state.inventory[id]);
      }).join("");
      elements.packArea.innerHTML = `
        <div class="pack-complete">
          <p class="eyebrow">¡MENÚ SERVIDO!</p>
          <h2>Recién coleccionadas</h2>
          <p>Las cartas ya están en tu álbum.</p>
          <div class="revealed-card-row">${summaryCards}</div>
          <div class="pack-complete-actions">
            <button class="secondary-button" type="button" data-action="finish-album">Ver álbum</button>
            <button class="primary-button" type="button" data-action="finish-packs">Volver al mostrador</button>
          </div>
        </div>`;
      return;
    }

    const card = cardsById.get(state.pack.cardIds[state.pack.revealed]);
    elements.packArea.innerHTML = `
      <div class="reveal-stage">
        <p class="reveal-progress">Carta ${state.pack.revealed + 1} de ${state.pack.cardIds.length}</p>
        <div class="reveal-card">${cardMarkup(card, state.inventory[card.id])}</div>
        <button class="primary-button" type="button" data-action="next-card">${state.pack.revealed === state.pack.cardIds.length - 1 ? "Terminar apertura" : "Revelar siguiente"}</button>
      </div>`;
  }

  function cardArtwork(card, owned) {
    if (!owned) return `<div class="food-art"><span class="locked-mark" aria-label="Carta sin descubrir">?</span></div>`;
    const fallback = `<span class="food-mark">${escapeHTML(card.symbol || "✦")}</span>`;
    if (!card.image) return `<div class="food-art">${fallback}</div>`;
    return `<div class="food-art"><img src="${escapeHTML(card.image)}" alt="" data-image-fallback><span hidden>${fallback}</span></div>`;
  }

  function cardMarkup(card, quantity, locked = false) {
    const owned = !locked && quantity > 0;
    const rarity = escapeHTML(card.rarity);
    const name = owned ? card.name : "Carta misteriosa";
    const category = owned ? card.category : "Sin descubrir";
    const flavor = owned ? card.flavor : "Completa el álbum para conocerla.";
    return `
      <article class="food-card rarity-${rarity} ${owned ? "" : "is-locked"}">
        <div class="food-card-header"><span class="rarity-label"><i class="rarity-dot rarity-${rarity}"></i>${escapeHTML(rarityNames[card.rarity])}</span><span class="card-quantity">${owned ? `×${quantity}` : "···"}</span></div>
        ${cardArtwork(card, owned)}
        <div class="food-card-body"><h3>${escapeHTML(name)}</h3><p>${escapeHTML(category)}</p><p class="card-flavor">${escapeHTML(flavor)}</p></div>
      </article>`;
  }

  function renderAlbum() {
    const counts = getCounts();
    const percent = Math.round((counts.unique / cards.length) * 100);
    elements.albumSummary.textContent = `${counts.unique} de ${cards.length} recetas descubiertas · ${counts.total} cartas en total`;
    elements.albumProgressLabel.textContent = `${percent}%`;
    elements.albumProgressBar.style.width = `${percent}%`;
    const visibleCards = cards.filter((card) => {
      const matchesCategory = activeCategory === "Todas" || card.category === activeCategory;
      const matchesRarity = elements.rarityFilter.value === "Todas" || card.rarity === elements.rarityFilter.value;
      const matchesOwned = !elements.ownedOnly.checked || state.inventory[card.id] > 0;
      return matchesCategory && matchesRarity && matchesOwned;
    });
    elements.albumGrid.innerHTML = visibleCards.length
      ? visibleCards.map((card) => cardMarkup(card, state.inventory[card.id] || 0, !(state.inventory[card.id] > 0))).join("")
      : `<div class="empty-album"><strong>Aún no hay recetas aquí</strong>Prueba otra categoría o abre un sobre.</div>`;
  }

  function applyImageFallbacks() {
    document.querySelectorAll("img[data-image-fallback]").forEach((image) => {
      image.addEventListener("error", () => {
        image.hidden = true;
        image.nextElementSibling.hidden = false;
      }, { once: true });
    });
  }

  function render() {
    renderHeader();
    renderOdds();
    renderPack();
    renderAlbum();
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.hidden = screen.id !== `screen-${activeScreen}`;
    });
    document.querySelectorAll("[data-screen]").forEach((button) => {
      const selected = button.dataset.screen === activeScreen;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    document.querySelectorAll("[data-category]").forEach((button) => {
      const selected = button.dataset.category === activeCategory;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    applyImageFallbacks();
  }

  function buyPack() {
    if (catalogError || state.pack || state.coins < config.packPrice) return;
    state.coins -= config.packPrice;
    state.pack = { opened: false, cardIds: [], revealed: 0 };
    saveState();
    render();
  }

  function openPack() {
    if (!state.pack || state.pack.opened) return;
    const pulledCards = Array.from({ length: config.cardsPerPack }, drawCard);
    state.pack = { opened: true, cardIds: pulledCards.map((card) => card.id), revealed: 0 };
    for (const card of pulledCards) state.inventory[card.id] = (state.inventory[card.id] || 0) + 1;
    saveState();
    render();
  }

  function finishPack(screen) {
    state.pack = null;
    activeScreen = screen;
    saveState();
    render();
  }

  function resetGame() {
    if (!window.confirm("¿Reiniciar monedas, sobres e inventario?")) return;
    state = defaultState();
    saveState();
    activeScreen = "packs";
    showMessage("Partida reiniciada.");
    render();
  }

  document.addEventListener("click", (event) => {
    const screenButton = event.target.closest("[data-screen]");
    if (screenButton) {
      activeScreen = screenButton.dataset.screen;
      render();
      return;
    }
    const screenLink = event.target.closest("[data-screen-link]");
    if (screenLink) {
      event.preventDefault();
      activeScreen = screenLink.dataset.screenLink;
      render();
      return;
    }
    const categoryButton = event.target.closest("[data-category]");
    if (categoryButton) {
      activeCategory = categoryButton.dataset.category;
      renderAlbum();
      render();
      return;
    }
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    switch (actionButton.dataset.action) {
      case "buy-pack": buyPack(); break;
      case "open-pack": openPack(); break;
      case "next-card":
        if (state.pack) {
          state.pack.revealed += 1;
          saveState();
          render();
        }
        break;
      case "finish-album": finishPack("album"); break;
      case "finish-packs": finishPack("packs"); break;
      case "reset": resetGame(); break;
      default: break;
    }
  });

  elements.ownedOnly.addEventListener("change", renderAlbum);
  elements.rarityFilter.addEventListener("change", renderAlbum);

  const catalogError = validateCatalog();
  if (catalogError) {
    elements.fatalError.textContent = catalogError;
    elements.fatalError.hidden = false;
  }
  render();
})();