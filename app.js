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
    pityProgress: document.querySelector("#pity-progress"),
    pityProgressFill: document.querySelector("#pity-progress-fill"),
    homePityLabel: document.querySelector("#home-pity-label"),
    homePityFill: document.querySelector("#home-pity-fill"),
    homeOpenButton: document.querySelector("#home-open-button"),
    homePackSub: document.querySelector("#home-pack-sub"),
    ownedOnly: document.querySelector("#owned-only"),
    rarityFilter: document.querySelector("#rarity-filter"),
    packArea: document.querySelector("#pack-area")
  };
  let activeScreen = "packs";
  let activeCategory = "Todas";
  let messageTimer;
  let packGesture = null;

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
    if (config.dupeBonus) {
      const dupeEntries = Object.entries(config.dupeBonus);
      if (dupeEntries.some(([rarity]) => !Object.hasOwn(config.odds, rarity))) {
        return "Cada rareza con bonus de duplicado debe existir en las probabilidades.";
      }
      if (dupeEntries.some(([, bonus]) => !Number.isInteger(bonus) || bonus < 0)) {
        return "Cada bonus de duplicado debe ser un entero mayor o igual a 0.";
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
      const guaranteed = streak >= streakLimit;
      elements.homePityLabel.textContent = `${streak}/${streakLimit}`;
      elements.homePityFill.style.width = streakLimit === 0 ? "100%" : `${(streak / streakLimit) * 100}%`;
      elements.homePityFill.parentElement.setAttribute("aria-valuemax", String(streakLimit));
      elements.homePityFill.parentElement.setAttribute("aria-valuenow", String(streak));
      elements.homePityFill.parentElement.setAttribute("aria-label", `Progreso de garantía ${rarityNames[config.pity.rarity]}`);
      elements.pityNote.classList.toggle("is-guaranteed", guaranteed);
      elements.pityProgress.hidden = false;
      elements.pityProgressFill.style.width = streakLimit === 0 ? "100%" : `${(streak / streakLimit) * 100}%`;
      elements.pityNote.textContent = guaranteed
        ? `¡La próxima carta es ${rarityNames[config.pity.rarity]} garantizada!`
        : `Cartas sin ${rarityNames[config.pity.rarity]}: ${streak}/${streakLimit} · la siguiente está garantizada al llegar a ${streakLimit}`;
      elements.pityNote.hidden = false;
    } else {
      elements.homePityLabel.textContent = "Sin garantía";
      elements.homePityFill.style.width = "0%";
      elements.homePityFill.parentElement.setAttribute("aria-valuenow", "0");
      elements.pityNote.classList.remove("is-guaranteed");
      elements.pityNote.hidden = true;
      elements.pityProgress.hidden = true;
      elements.pityProgressFill.style.width = "0%";
    }
  }

  function packArtwork(interactive = false) {
    const interaction = interactive
      ? 'data-pack-drag role="button" tabindex="0" aria-label="Arrastra el sobre hacia arriba para rasgar el sello"'
      : 'aria-hidden="true"';
    const artworkClass = interactive ? "pack-drag-target" : "pack-hero";
    return `
      <div class="pack-spectacle">
        <div class="scene-halo" aria-hidden="true"></div>
        <div class="scene-ring scene-ring-one" aria-hidden="true"></div>
        <div class="scene-ring scene-ring-two" aria-hidden="true"></div>
        <div class="pack-illustration ${artworkClass}" ${interaction}>
          <div class="pack-content">
            <span class="pack-emblem">✦</span>
            <span class="pack-name">GACHA<br><strong>GOURMET</strong></span>
            <span class="pack-sub">MENÚ SECRETO</span>
          </div>
          <span class="pack-tear-line" aria-hidden="true"></span>
        </div>
        <p class="pack-stage-caption">EDICIÓN · MENÚ SECRETO</p>
      </div>`;
  }

  function renderPack() {
    if (!state.pack) {
      elements.packArea.innerHTML = "";
      return;
    }

    if (!state.pack.opened) {
      elements.packArea.innerHTML = `
        <div class="pack-opening-layout is-ready">
          ${packArtwork(true)}
          <div class="pack-copy">
            <p class="eyebrow"><span class="eyebrow-dot"></span> SELLO INTACTO</p>
            <h2>Rasga el sello</h2>
            <p>Desliza el sobre hacia arriba para descubrir tus ${config.cardsPerPack} cartas.</p>
            <button class="primary-button" type="button" data-action="open-pack">RASGAR Y REVELAR</button>
            <span class="gesture-caption">O MANTÉN Y ARRASTRA</span>
          </div>
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
          <p class="eyebrow"><span class="eyebrow-dot"></span> MENÚ SERVIDO</p>
          <h2>¡Tres cartas<br>sobre la mesa!</h2>
          <p>Ya puedes verlas en tu álbum. ¿Qué te ha tocado?</p>
          <div class="revealed-card-row">${summaryCards}</div>
          <div class="pack-complete-actions">
            <button class="secondary-button" type="button" data-action="finish-album">Ver álbum</button>
            <button class="primary-button" type="button" data-action="finish-packs">Volver al inicio</button>
          </div>
        </div>`;
      return;
    }

    const card = cardsById.get(state.pack.cardIds[state.pack.revealed]);
    const progressDots = state.pack.cardIds.map((_, index) => `<span class="reveal-step ${index <= state.pack.revealed ? "is-lit" : ""}"></span>`).join("");
    elements.packArea.innerHTML = `
      <div class="reveal-stage rarity-${escapeHTML(card.rarity)}">
        <div class="reveal-heading">
          <div><p class="eyebrow"><span class="eyebrow-dot"></span> CARTA REVELADA</p><p class="reveal-progress">${String(state.pack.revealed + 1).padStart(2, "0")} <span>/ ${String(state.pack.cardIds.length).padStart(2, "0")}</span></p></div>
          <div class="reveal-steps" aria-hidden="true">${progressDots}</div>
        </div>
        <div class="reveal-card">${cardMarkup(card, state.inventory[card.id])}</div>
        <p class="reveal-invitation">Una receta nueva toma el centro de la mesa.</p>
        <button class="primary-button" type="button" data-action="next-card">${state.pack.revealed === state.pack.cardIds.length - 1 ? "¡Descubrir la última!" : "Revelar siguiente"}</button>
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
    const rarityClass = owned ? `rarity-${rarity}` : "";
    const rarityLabel = owned ? rarityNames[card.rarity] : "SIN DESCUBRIR";
    const rarityDot = owned ? `<i class="rarity-dot ${rarityClass}"></i>` : "";
    const quantityTier = owned && quantity > 1 ? "multiple" : "single";
    const name = owned ? card.name : "Carta misteriosa";
    const category = owned ? card.category : "Sin descubrir";
    const flavor = owned ? card.flavor : "Completa el álbum para conocerla.";
    return `
      <article class="food-card ${rarityClass} ${owned ? "" : "is-locked"}">
        <div class="food-card-header"><span class="rarity-label">${rarityDot}${escapeHTML(rarityLabel)}</span><span class="card-quantity" data-quantity-tier="${quantityTier}">${owned ? `×${quantity}` : "···"}</span></div>
        ${cardArtwork(card, owned)}
        <div class="food-card-body"><h3>${escapeHTML(name)}</h3><p>${escapeHTML(category)}</p><p class="card-flavor">${escapeHTML(flavor)}</p></div>
      </article>`;
  }

  function renderAlbum() {
    const counts = getCounts();
    const percent = Math.round((counts.unique / cards.length) * 100);
    const uniqueSummary = document.createElement("span");
    uniqueSummary.className = "album-summary-main";
    uniqueSummary.textContent = `${counts.unique} de ${cards.length} recetas descubiertas`;
    const copySummary = document.createElement("span");
    copySummary.className = "album-summary-total";
    copySummary.textContent = `${counts.total} copias en total`;
    elements.albumSummary.replaceChildren(uniqueSummary, copySummary);
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
      : `<div class="empty-album"><strong>¡Aquí aún queda mucho por descubrir!</strong>Cambia los filtros o abre un sobre para encontrar más recetas.</div>`;
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
    renderHome();
    renderPack();
    renderAlbum();
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.hidden = screen.id !== `screen-${activeScreen}`;
    });
    document.querySelector(".game-shell").classList.toggle("is-opening", activeScreen === "opening");
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

  function renderHome() {
    if (state.pack) {
      elements.homeOpenButton.textContent = "CONTINUAR";
      elements.homeOpenButton.dataset.action = "continue-pack";
      elements.homeOpenButton.disabled = false;
      elements.homePackSub.textContent = "Sobre en curso";
      return;
    }
    const availablePacks = Math.floor(state.coins / config.packPrice);
    const shortfall = Math.max(0, config.packPrice - state.coins);
    elements.homeOpenButton.textContent = "ABRIR";
    elements.homeOpenButton.dataset.action = "buy-pack";
    elements.homeOpenButton.disabled = Boolean(catalogError) || availablePacks < 1;
    elements.homePackSub.textContent = availablePacks > 0
      ? `Sobres disponibles: ${availablePacks}`
      : `Te faltan ${shortfall} monedas`;
  }

  function buyPack() {
    if (catalogError || state.pack || state.coins < config.packPrice) return;
    state.coins -= config.packPrice;
    state.pack = { opened: false, cardIds: [], revealed: 0 };
    saveState();
    activeScreen = "opening";
    render();
  }

  function openPack() {
    if (!state.pack || state.pack.opened) return;
    const pulledCards = Array.from({ length: config.cardsPerPack }, drawCard);
    state.pack = { opened: true, cardIds: pulledCards.map((card) => card.id), revealed: 0 };
    let dupeBonusEarned = 0;
    for (const card of pulledCards) {
      const alreadyOwned = (state.inventory[card.id] || 0) > 0;
      state.inventory[card.id] = (state.inventory[card.id] || 0) + 1;
      if (alreadyOwned && config.dupeBonus) {
        dupeBonusEarned += config.dupeBonus[card.rarity] || 0;
      }
    }
    if (dupeBonusEarned > 0) {
      state.coins += dupeBonusEarned;
      showMessage(`+${dupeBonusEarned} monedas por duplicados`);
    }
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

  document.addEventListener("pointerdown", (event) => {
    const target = event.target.closest?.("[data-pack-drag]");
    if (!target || !state.pack || state.pack.opened) return;
    packGesture = { pointerId: event.pointerId, startY: event.clientY, target };
    target.classList.add("is-dragging");
    target.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  document.addEventListener("pointermove", (event) => {
    if (!packGesture || event.pointerId !== packGesture.pointerId) return;
    const pull = Math.max(0, Math.min(1, (packGesture.startY - event.clientY) / 150));
    packGesture.target.style.setProperty("--pack-pull", pull.toFixed(2));
    packGesture.target.style.setProperty("--pack-drag-y", `${-pull * 72}px`);
    packGesture.target.style.setProperty("--pack-drag-rotation", `${-pull * 9}deg`);
    if (event.cancelable) event.preventDefault();
  });

  function finishPackGesture(event, cancelled = false) {
    if (!packGesture || event.pointerId !== packGesture.pointerId) return;
    const { target } = packGesture;
    const pull = Number(target.style.getPropertyValue("--pack-pull")) || 0;
    target.classList.remove("is-dragging");
    target.style.removeProperty("--pack-pull");
    target.style.removeProperty("--pack-drag-y");
    target.style.removeProperty("--pack-drag-rotation");
    packGesture = null;
    if (!cancelled && pull >= 0.68) openPack();
  }

  document.addEventListener("pointerup", finishPackGesture);
  document.addEventListener("pointercancel", (event) => finishPackGesture(event, true));
  document.addEventListener("keydown", (event) => {
    const target = event.target.closest?.("[data-pack-drag]");
    if (!target || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    openPack();
  });

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
      case "continue-pack":
        activeScreen = "opening";
        render();
        break;
      case "return-home":
        activeScreen = "packs";
        render();
        break;
      case "placeholder": showMessage(actionButton.dataset.message || "Próximamente"); break;
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