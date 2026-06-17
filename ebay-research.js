const DATA_URL = "./data/ebay-research-dashboard.json?v=20260617-review-sync-v3";
const DUPLICATE_CHECK_URL = "./api/listing-duplicates";
const REVIEW_SAVE_URL = "./api/listing-status";
const REVIEW_STORAGE_KEY = "ebayResearchManualReviews:v1";
const PANEL_PREFS_STORAGE_KEY = "ebayResearchPanelPrefs:v1";
const SIDEBAR_STORAGE_KEY = "ebayResearchSidebarWidth:v1";
const RIGHT_SIDEBAR_STORAGE_KEY = "ebayResearchRightSidebarWidth:v1";
const SIDEBAR_DEFAULT_WIDTH = 420;
const SIDEBAR_MIN_WIDTH = 320;
const SIDEBAR_MAX_WIDTH = 720;
const RIGHT_SIDEBAR_DEFAULT_WIDTH = 340;
const RIGHT_SIDEBAR_MIN_WIDTH = 300;
const RIGHT_SIDEBAR_MAX_WIDTH = 640;
const HUMAN_DECISIONS = ["未判断", "◯", "△", "✗"];
const SOURCING_TARGET_PROFIT_RATE = 0.1;

const state = {
  items: [],
  meta: {},
  reviews: {},
  selectedId: "",
  query: "",
  decision: "all",
  reviewStatus: "all",
  shippingClass: "all",
  sort: "sheet",
  reviewSync: {},
  reviewDirty: new Set(),
  sheetLinkCount: 0,
};

const el = {
  shell: document.querySelector(".research-shell"),
  sidebarResizer: document.querySelector(".sidebar-resizer"),
  rightSidebarResizer: document.querySelector(".right-sidebar-resizer"),
  sourceSheetLink: document.querySelector("#sourceSheetLink"),
  summaryToggle: document.querySelector("#summaryToggle"),
  summaryDigest: document.querySelector("#summaryDigest"),
  summaryTotal: document.querySelector("#summaryTotal"),
  summaryOk: document.querySelector("#summaryOk"),
  summaryMaybe: document.querySelector("#summaryMaybe"),
  summaryNo: document.querySelector("#summaryNo"),
  productSearch: document.querySelector("#productSearch"),
  reviewToggle: document.querySelector("#reviewToggle"),
  reviewDigest: document.querySelector("#reviewDigest"),
  reviewEditor: document.querySelector("#reviewEditor"),
  reviewSaveButton: document.querySelector("#saveReviewNowButton"),
  reviewReloadButton: document.querySelector("#reloadReviewsButton"),
  resultLine: document.querySelector("#resultLine"),
  productList: document.querySelector("#productList"),
  loadingState: document.querySelector("#loadingState"),
  productPreview: document.querySelector("#productPreview"),
  rightSidebar: document.querySelector("#rightSidebar"),
};

init();

async function init() {
  state.reviews = loadReviews();
  bindEvents();
  initSidebarResize();
  initRightSidebarResize();
  initPanelToggles();
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.items = data.items || [];
    state.meta = data.meta || {};
    state.selectedId = state.items[0]?.id || "";
    await loadSharedItemLinksFromSheet();
    await loadSharedReviewsFromSheet();
    initializeDirtyReviews();
    render();
    loadDuplicateChecks();
  } catch (error) {
    el.loadingState.innerHTML = `
      <i data-lucide="circle-alert" aria-hidden="true"></i>
      <p>データを読み込めませんでした</p>
    `;
    renderIcons();
  }
}

async function loadDuplicateChecks() {
  try {
    const payload = await postJson(DUPLICATE_CHECK_URL, {
      items: state.items.map((item) => ({
        id: item.id,
        title: item.title,
        normalizedTitle: item.normalizedTitle,
        keyword: item.ebayKeyword || item.domesticKeyword,
        condition: item.condition,
        ebayReference: item.links?.competitor || item.selfListing?.matchedUrl || "",
      })),
    });
    if (!payload.configured || !payload.results) return;
    state.items = state.items.map((item) => ({
      ...item,
      duplicateCheck: payload.results[item.id] || item.duplicateCheck,
    }));
    render();
  } catch {
    // The static research view remains usable if the Sheets-backed duplicate check is unavailable.
  }
}

function bindEvents() {
  el.productSearch.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    syncSelection();
    render();
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.filter;
      if (!["decision", "reviewStatus", "shippingClass", "sort"].includes(key)) return;
      state[key] = button.dataset.value || defaultFilterValue(key);
      syncSelection();
      render();
    });
  });

  el.reviewSaveButton?.addEventListener("click", () => {
    saveDirtyReviewsToSheet();
  });

  el.reviewReloadButton?.addEventListener("click", () => {
    reloadSharedReviewsFromSheet();
  });

  document.addEventListener("keydown", handleKeyboardNavigation);
}

function initPanelToggles() {
  const prefs = loadPanelPrefs();
  setDetailsOpen(el.summaryToggle, Boolean(prefs.summaryOpen));
  setDetailsOpen(el.reviewToggle, Boolean(prefs.reviewOpen));

  [el.summaryToggle, el.reviewToggle].forEach((details) => {
    details?.addEventListener("toggle", savePanelPrefs);
  });
}

function setDetailsOpen(details, open) {
  if (!details) return;
  details.open = open;
}

function loadPanelPrefs() {
  try {
    const payload = JSON.parse(localStorage.getItem(PANEL_PREFS_STORAGE_KEY) || "{}");
    return payload && typeof payload === "object" ? payload : {};
  } catch {
    return {};
  }
}

function savePanelPrefs() {
  localStorage.setItem(
    PANEL_PREFS_STORAGE_KEY,
    JSON.stringify({
      summaryOpen: Boolean(el.summaryToggle?.open),
      reviewOpen: Boolean(el.reviewToggle?.open),
    }),
  );
}

function initSidebarResize() {
  if (!el.shell || !el.sidebarResizer) return;
  setSidebarWidth(readStoredSidebarWidth(), { persist: false });

  let startX = 0;
  let startWidth = 0;
  let activePointerId = null;

  el.sidebarResizer.addEventListener("pointerdown", (event) => {
    activePointerId = event.pointerId;
    startX = event.clientX;
    startWidth = getCurrentSidebarWidth();
    el.sidebarResizer.setPointerCapture(event.pointerId);
    document.body.classList.add("is-resizing-sidebar");
  });

  el.sidebarResizer.addEventListener("pointermove", (event) => {
    if (activePointerId !== event.pointerId) return;
    setSidebarWidth(startWidth + event.clientX - startX, { persist: false });
  });

  const stopResize = (event) => {
    if (activePointerId !== event.pointerId) return;
    activePointerId = null;
    document.body.classList.remove("is-resizing-sidebar");
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(getCurrentSidebarWidth()));
  };
  el.sidebarResizer.addEventListener("pointerup", stopResize);
  el.sidebarResizer.addEventListener("pointercancel", stopResize);

  el.sidebarResizer.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = getCurrentSidebarWidth();
    if (event.key === "Home") setSidebarWidth(SIDEBAR_MIN_WIDTH);
    else if (event.key === "End") setSidebarWidth(SIDEBAR_MAX_WIDTH);
    else setSidebarWidth(current + (event.key === "ArrowRight" ? 24 : -24));
  });

  window.addEventListener("resize", () => setSidebarWidth(getCurrentSidebarWidth()));
}

function readStoredSidebarWidth() {
  const value = Number(localStorage.getItem(SIDEBAR_STORAGE_KEY));
  return Number.isFinite(value) && value > 0 ? value : SIDEBAR_DEFAULT_WIDTH;
}

function getCurrentSidebarWidth() {
  const value = getComputedStyle(el.shell).getPropertyValue("--research-sidebar-width");
  return Number.parseFloat(value) || SIDEBAR_DEFAULT_WIDTH;
}

function setSidebarWidth(width, options = {}) {
  if (!el.shell || !el.sidebarResizer) return;
  const next = clampSidebarWidth(width);
  el.shell.style.setProperty("--research-sidebar-width", `${next}px`);
  el.sidebarResizer.setAttribute("aria-valuenow", String(Math.round(next)));
  if (options.persist !== false) {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(Math.round(next)));
  }
}

function clampSidebarWidth(width) {
  const viewportMax = Math.max(SIDEBAR_MIN_WIDTH, window.innerWidth - getCurrentRightSidebarWidth() - 540);
  return Math.round(Math.min(Math.max(Number(width) || SIDEBAR_DEFAULT_WIDTH, SIDEBAR_MIN_WIDTH), Math.min(SIDEBAR_MAX_WIDTH, viewportMax)));
}

function initRightSidebarResize() {
  if (!el.shell || !el.rightSidebarResizer) return;
  setRightSidebarWidth(readStoredRightSidebarWidth(), { persist: false });

  let startX = 0;
  let startWidth = 0;
  let activePointerId = null;

  el.rightSidebarResizer.addEventListener("pointerdown", (event) => {
    activePointerId = event.pointerId;
    startX = event.clientX;
    startWidth = getCurrentRightSidebarWidth();
    el.rightSidebarResizer.setPointerCapture(event.pointerId);
    document.body.classList.add("is-resizing-sidebar");
  });

  el.rightSidebarResizer.addEventListener("pointermove", (event) => {
    if (activePointerId !== event.pointerId) return;
    setRightSidebarWidth(startWidth - (event.clientX - startX), { persist: false });
  });

  const stopResize = (event) => {
    if (activePointerId !== event.pointerId) return;
    activePointerId = null;
    document.body.classList.remove("is-resizing-sidebar");
    localStorage.setItem(RIGHT_SIDEBAR_STORAGE_KEY, String(getCurrentRightSidebarWidth()));
  };
  el.rightSidebarResizer.addEventListener("pointerup", stopResize);
  el.rightSidebarResizer.addEventListener("pointercancel", stopResize);

  el.rightSidebarResizer.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = getCurrentRightSidebarWidth();
    if (event.key === "Home") setRightSidebarWidth(RIGHT_SIDEBAR_MIN_WIDTH);
    else if (event.key === "End") setRightSidebarWidth(RIGHT_SIDEBAR_MAX_WIDTH);
    else setRightSidebarWidth(current + (event.key === "ArrowLeft" ? 24 : -24));
  });

  window.addEventListener("resize", () => setRightSidebarWidth(getCurrentRightSidebarWidth()));
}

function readStoredRightSidebarWidth() {
  const value = Number(localStorage.getItem(RIGHT_SIDEBAR_STORAGE_KEY));
  return Number.isFinite(value) && value > 0 ? value : RIGHT_SIDEBAR_DEFAULT_WIDTH;
}

function getCurrentRightSidebarWidth() {
  const value = getComputedStyle(el.shell).getPropertyValue("--right-sidebar-width");
  return Number.parseFloat(value) || RIGHT_SIDEBAR_DEFAULT_WIDTH;
}

function setRightSidebarWidth(width, options = {}) {
  if (!el.shell || !el.rightSidebarResizer) return;
  const next = clampRightSidebarWidth(width);
  el.shell.style.setProperty("--right-sidebar-width", `${next}px`);
  el.rightSidebarResizer.setAttribute("aria-valuenow", String(Math.round(next)));
  if (options.persist !== false) {
    localStorage.setItem(RIGHT_SIDEBAR_STORAGE_KEY, String(Math.round(next)));
  }
}

function clampRightSidebarWidth(width) {
  const viewportMax = Math.max(RIGHT_SIDEBAR_MIN_WIDTH, window.innerWidth - getCurrentSidebarWidth() - 540);
  return Math.round(Math.min(Math.max(Number(width) || RIGHT_SIDEBAR_DEFAULT_WIDTH, RIGHT_SIDEBAR_MIN_WIDTH), Math.min(RIGHT_SIDEBAR_MAX_WIDTH, viewportMax)));
}

function syncSelection() {
  const visible = getVisibleItems();
  if (!visible.some((item) => item.id === state.selectedId)) {
    state.selectedId = visible[0]?.id || "";
  }
}

function render() {
  renderTopLinks();
  renderSummary();
  renderReviewEditor();
  renderList();
  renderPreview();
  renderRightSidebar();
  renderFilterButtons();
  renderIcons();
  scrollSelectedRowIntoView();
}

function renderTopLinks() {
  if (!el.sourceSheetLink) return;
  const url = state.meta.sourceSpreadsheetUrl || "";
  if (!url) {
    el.sourceSheetLink.href = "#";
    el.sourceSheetLink.setAttribute("aria-disabled", "true");
    el.sourceSheetLink.classList.add("is-disabled");
    return;
  }
  el.sourceSheetLink.href = url;
  el.sourceSheetLink.removeAttribute("aria-disabled");
  el.sourceSheetLink.classList.remove("is-disabled");
}

function renderSummary() {
  const counts = state.items.reduce((acc, item) => {
    acc[item.decision] = (acc[item.decision] || 0) + 1;
    return acc;
  }, {});
  const total = state.items.length;
  const ok = counts["◯"] || 0;
  const maybe = counts["△"] || 0;
  const no = counts["✗"] || 0;
  el.summaryTotal.textContent = formatNumber(total);
  el.summaryOk.textContent = formatNumber(ok);
  el.summaryMaybe.textContent = formatNumber(maybe);
  el.summaryNo.textContent = formatNumber(no);
  if (el.summaryDigest) {
    el.summaryDigest.textContent = filterDigestText();
  }
}

function renderFilterButtons() {
  document.querySelectorAll("[data-filter]").forEach((button) => {
    const key = button.dataset.filter;
    if (!key || !(key in state)) return;
    button.classList.toggle("is-active", button.dataset.value === state[key]);
  });
}

function defaultFilterValue(key) {
  if (key === "sort") return "sheet";
  return "all";
}

function filterDigestText() {
  const parts = [];
  if (state.decision !== "all") parts.push(`AI ${state.decision}`);
  if (state.reviewStatus !== "all") parts.push(state.reviewStatus === "done" ? "目視済" : "目視未");
  if (state.shippingClass !== "all") parts.push(state.shippingClass);
  if (!parts.length) parts.push("すべて");
  parts.push(sortLabel(state.sort));
  return parts.join(" / ");
}

function sortLabel(value) {
  const labels = {
    sheet: "シート順",
    profit: "利益順",
    sold: "Sold順",
    price: "売価順",
    dutyProfit: "関税込み利益順",
  };
  return labels[value] || "シート順";
}

function renderList() {
  const items = getVisibleItems();
  el.resultLine.textContent = `${formatNumber(items.length)}件表示 / ${formatDateTime(state.meta.generatedAt)} 更新`;
  el.productList.innerHTML = items
    .map((item) => {
      const active = item.id === state.selectedId ? " is-active" : "";
      const listed = getListingLabel(item.selfListing.status);
      const review = getReview(item.id);
      const refreshBadge = hasReviewRefreshRequest(review)
        ? `<span class="refresh-inline-badge">再取得</span>`
        : "";
      return `
        <button class="product-row${active}" type="button" data-id="${escapeAttribute(item.id)}">
          <span class="decision-badge decision-${decisionClass(item.decision)}" aria-label="AI判断 ${escapeAttribute(item.decision)}">${escapeHtml(item.decision)}</span>
          <span class="product-row-main">
            <strong>${escapeHtml(item.title)}</strong>
            <span>
              PR30 ${formatSoldCount(getTerapeakSold30(item))}・競合 ${formatSoldCount(getCompetitorSoldTotal(item))}・利益 ${formatYen(item.profit.profitAfterDutyJpy)}
              ${refreshBadge}
            </span>
          </span>
          <span class="decision-badge manual-badge decision-${decisionClass(review.decision)}" aria-label="目視判断 ${escapeAttribute(review.decision)}">${escapeHtml(shortDecision(review.decision))}</span>
          <span class="listed-badge">${listed}</span>
        </button>
      `;
    })
    .join("");

  el.productList.querySelectorAll("[data-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectItem(button.dataset.id || "");
    });
  });
}

function renderReviewEditor() {
  const item = state.items.find((entry) => entry.id === state.selectedId);
  if (!item) {
    el.reviewEditor.innerHTML = "";
    if (el.reviewDigest) el.reviewDigest.textContent = "未入力";
    renderReviewSaveButton();
    return;
  }

  const review = getReview(item.id);
  const sync = getReviewSync(item.id);
  if (el.reviewDigest) {
    const memoLabel = review.memo ? "メモあり" : "メモなし";
    const refreshLabel = hasReviewRefreshRequest(review) ? "再取得" : "再取得なし";
    el.reviewDigest.textContent = `${shortDecision(review.decision)} / ${memoLabel} / ${refreshLabel}`;
  }
  const defaultReferenceUrl = defaultRefreshReferenceUrl(item);
  el.reviewEditor.innerHTML = `
    <div class="review-editor-head">
      <div>
        <span>目視判断</span>
        <strong>#${formatNumber(item.no)}</strong>
      </div>
      <span class="review-updated">${escapeHtml(formatReviewUpdated(review.updatedAt))}</span>
    </div>
    <div class="review-sync-status ${escapeAttribute(sync.type)}" id="reviewSyncStatus">
      <i data-lucide="${escapeAttribute(sync.icon)}" aria-hidden="true"></i>
      <span>${escapeHtml(sync.label)}</span>
    </div>
    <div class="manual-decision-controls" role="group" aria-label="目視判断">
      ${HUMAN_DECISIONS.map(
        (decision) => `
          <button class="manual-choice decision-${decisionClass(decision)}${review.decision === decision ? " is-active" : ""}" type="button" data-review-decision="${escapeAttribute(decision)}">
            ${escapeHtml(shortDecision(decision))}
          </button>
        `,
      ).join("")}
    </div>
    <label class="review-field">
      <span>目視メモ</span>
      <textarea id="manualReviewMemo" rows="3" placeholder="状態、仕入条件、出品時の注意点">${escapeHtml(review.memo)}</textarea>
    </label>
    <section class="refresh-request-box${hasReviewRefreshRequest(review) ? " is-active" : ""}">
      <label class="refresh-toggle">
        <input id="refreshRequested" type="checkbox" ${hasReviewRefreshRequest(review) ? "checked" : ""} />
        <span>情報再取得</span>
      </label>
      <p>競合価格、タイトル条件、Sold数が違う時だけ依頼として残す。</p>
      <label class="review-field">
        <span>再取得理由</span>
        <textarea id="refreshReason" rows="3" placeholder="例: 競合価格が表示と違う / タイトル条件が一致しない">${escapeHtml(review.refreshReason)}</textarea>
      </label>
      <label class="review-field">
        <span>参考URL</span>
        <input id="refreshReferenceUrl" type="url" inputmode="url" placeholder="${escapeAttribute(defaultReferenceUrl || "https://www.ebay.com/...")}" value="${escapeAttribute(review.refreshReferenceUrl)}" />
      </label>
    </section>
  `;
  renderReviewSaveButton();

  el.reviewEditor.querySelectorAll("[data-review-decision]").forEach((button) => {
    button.addEventListener("click", () => {
      updateReview(item.id, { decision: button.dataset.reviewDecision || "未判断" });
    });
  });

  el.reviewEditor.querySelector("#manualReviewMemo").addEventListener("input", (event) => {
    updateReview(item.id, { memo: event.target.value }, { rerender: false });
    renderPreview();
  });

  el.reviewEditor.querySelector("#refreshRequested").addEventListener("change", (event) => {
    updateReview(item.id, { refreshRequested: event.target.checked });
  });

  el.reviewEditor.querySelector("#refreshReason").addEventListener("input", (event) => {
    const value = event.target.value;
    updateReview(item.id, { refreshReason: value, refreshRequested: Boolean(value.trim()) || getReview(item.id).refreshRequested }, { rerender: false });
    renderPreview();
    renderList();
    renderReviewSaveButton();
  });

  el.reviewEditor.querySelector("#refreshReferenceUrl").addEventListener("input", (event) => {
    const value = event.target.value;
    updateReview(item.id, { refreshReferenceUrl: value, refreshRequested: Boolean(value.trim()) || getReview(item.id).refreshRequested }, { rerender: false });
    renderPreview();
    renderList();
    renderReviewSaveButton();
  });

}

function renderPreview() {
  const item = state.items.find((entry) => entry.id === state.selectedId);
  if (!item) {
    el.loadingState.hidden = false;
    el.productPreview.hidden = true;
    el.loadingState.innerHTML = `
      <i data-lucide="folder-search" aria-hidden="true"></i>
      <p>表示できる商品がありません</p>
    `;
    return;
  }

  el.loadingState.hidden = true;
  el.productPreview.hidden = false;
  const review = getReview(item.id);
  const duplicate = getDuplicateCheck(item);
  const researchLinks = getListingResearchLinks(item);
  const previewSources = getPreviewSources(item);
  el.productPreview.innerHTML = `
    <header class="preview-head">
      <div class="title-block">
        <span class="row-number">#${formatNumber(item.no)}</span>
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(displayCategory(item.category) || "カテゴリ未設定")}</p>
      </div>
      <div class="decision-stack">
        <div class="decision-large decision-${decisionClass(item.decision)}">
          <span>出品可否AI判断</span>
          <strong>${escapeHtml(item.decision)}</strong>
        </div>
        <div class="decision-large decision-${decisionClass(review.decision)}">
          <span>目視判断</span>
          <strong>${escapeHtml(shortDecision(review.decision))}</strong>
        </div>
        <div class="decision-large duplicate-large decision-${duplicateClass(duplicate.status)}">
          <span>重複チェック</span>
          <strong>${escapeHtml(shortDuplicateStatus(duplicate.status))}</strong>
          <small>${escapeHtml(duplicate.matchType || duplicate.note || "Active照合")}</small>
        </div>
        ${
          hasReviewRefreshRequest(review)
            ? `<div class="decision-large refresh-large">
                <span>情報再取得</span>
                <strong>要確認</strong>
                <small>${escapeHtml(review.refreshReason || "競合価格・条件を再確認")}</small>
              </div>`
            : ""
        }
      </div>
    </header>

    <section class="shortcut-section preview-shortcut-section" aria-label="タブ移動の操作メモ">
      <div class="card-title">
        <i data-lucide="panel-top" aria-hidden="true"></i>
        <h3>タブ移動</h3>
      </div>
      <div class="shortcut-list">
        <span><kbd>Cmd/Ctrl+Tab</kbd>次タブ</span>
        <span><kbd>Cmd/Ctrl+Shift+Tab</kbd>前タブ</span>
        <span><kbd>Cmd/Ctrl+L</kbd>URL欄</span>
      </div>
    </section>

    <section class="alert-line">
      <i data-lucide="info" aria-hidden="true"></i>
      <span>${escapeHtml(item.decisionReason || "判定理由は未入力です")}</span>
    </section>

    <section class="metric-grid" aria-label="主要指標">
      ${metricCard("競合価格", `$${formatUsd(item.pricing.ebayTotalUsd)}`, formatYen(item.pricing.ebayTotalJpy))}
      ${metricCard("Condition", item.condition || "未確認", "Source sheet")}
      ${metricCard("仕入れ価格目安", formatYen(item.pricing.domesticPriceJpy), domesticSearchCapText(item) || item.domesticSource?.label || "国内価格目安")}
      ${metricCard("30日Sold", formatSoldCount(getTerapeakSold30(item)), "Terapeak/Product Research")}
      ${metricCard("競合累積Sold", formatSoldCount(getCompetitorSoldTotal(item)), "SellerHacks/競合データ")}
      ${metricCard("Order earning", formatYen(item.profit.orderEarningJpy), `eBay手数料 ${formatYen(item.profit.ebayFeeJpy)}`)}
      ${metricCard("関税込み利益", formatYen(item.profit.profitAfterDutyJpy), `${formatPercent(item.profit.profitAfterDutyRate)} / 還付 ${formatYen(item.profit.taxRefundJpy)}`)}
    </section>

    <section class="preview-grid">
      <div class="info-card visual-card">
        <div class="card-title">
          <i data-lucide="image" aria-hidden="true"></i>
          <h3>競合・仕入先プレビュー</h3>
        </div>
        <div class="visual-grid">
          ${previewSources.map((source) => previewTile(source)).join("")}
        </div>
      </div>

      <div class="info-card visual-card research-link-card">
        <div class="link-panel-head">
          <div class="card-title">
            <i data-lucide="external-link" aria-hidden="true"></i>
            <h3>リサーチリンク集</h3>
          </div>
          <button class="open-all-links" type="button" data-copy-research-links>
            <i data-lucide="copy" aria-hidden="true"></i>
            <span>URL一括コピー</span>
          </button>
        </div>
        <p class="muted-note">出品可否、競合、既存出品、HTS確認に使うリンクです。</p>
        <div class="link-grid research-link-grid">
          ${researchLinks.map((link) => actionLink(link.label, link.url, link.icon)).join("")}
        </div>
      </div>

      <div class="info-card">
        <div class="card-title">
          <i data-lucide="list-checks" aria-hidden="true"></i>
          <h3>商品スペック</h3>
        </div>
        <dl class="detail-list">
          ${detailRow("Condition", item.condition || "未確認")}
          ${detailRow("構成", item.specs.component)}
          ${detailRow("種別", item.specs.clubType)}
          ${detailRow("利き手", item.specs.handedness)}
          ${detailRow("ロフト角", item.specs.loft)}
          ${detailRow("番手", `${item.specs.setComposition} / ${item.specs.pieceCount}`)}
          ${detailRow("シャフト", `${item.specs.shaft} / Flex ${item.specs.flex}`)}
        </dl>
        <p class="muted-note">${escapeHtml(item.specs.confidence)}</p>
      </div>

      <div class="info-card">
        <div class="card-title">
          <i data-lucide="truck" aria-hidden="true"></i>
          <h3>物流・梱包</h3>
        </div>
        <dl class="detail-list">
          ${detailRow("国内→OR", formatYen(item.logistics.ninjaToOregonJpy))}
          ${
            item.logistics.upsSpecialHandlingJpy
              ? detailRow("UPS特別", formatYen(item.logistics.upsSpecialHandlingJpy))
              : ""
          }
          ${detailRow("OR→購入者", formatYen(item.logistics.oregonToBuyerJpy))}
          ${detailRow("送料合計", formatYen(item.logistics.totalLogisticsJpy))}
          ${detailRow("サイズ", item.packaging.size)}
          ${detailRow("資材", item.packaging.material)}
        </dl>
        <p class="muted-note">${escapeHtml(item.packaging.note)}</p>
      </div>

      <div class="info-card">
        <div class="card-title">
          <i data-lucide="receipt" aria-hidden="true"></i>
          <h3>費用・税務</h3>
        </div>
        <dl class="detail-list">
          ${detailRow("仕入", formatYen(item.pricing.domesticPriceJpy))}
          ${item.pricing.domesticSearchMaxJpy ? detailRow("国内検索上限", formatYen(item.pricing.domesticSearchMaxJpy)) : ""}
          ${detailRow("eBay手数料", `${formatYen(item.profit.ebayFeeJpy)} / ${formatPercent(item.profit.ebayFeeRate)}`)}
          ${detailRow("還付候補", formatYen(item.profit.taxRefundJpy))}
          ${detailRow("関税候補", `${formatYen(item.profit.dutyJpy)} / ${formatPercent(item.profit.dutyRate)}`)}
          ${detailRow("HTS", `${item.hts.code} (${item.hts.confidence})`)}
        </dl>
        <p class="muted-note">${escapeHtml(item.hts.label)} / 公式税率候補 ${formatPercent(item.hts.officialDutyRate)}</p>
      </div>

      <div class="info-card">
        <div class="card-title">
          <i data-lucide="badge-check" aria-hidden="true"></i>
          <h3>自社eBay出品状況</h3>
        </div>
        <div class="status-box">
          <span class="listed-status">${escapeHtml(item.selfListing.status)}</span>
          <p>${escapeHtml(item.selfListing.confidence)}</p>
        </div>
        <div class="status-box duplicate-status-box">
          <span class="listed-status duplicate-${duplicateClass(duplicate.status)}">${escapeHtml(duplicate.status)}</span>
          <p>${escapeHtml(duplicate.title || duplicate.note || "既存Activeマスターとの照合結果を表示します。")}</p>
          ${duplicate.url ? `<a href="${escapeAttribute(duplicate.url)}" target="_blank" rel="noreferrer">${escapeHtml(duplicate.url)}</a>` : ""}
        </div>
        <div class="button-row">
          ${actionLink("good-select-jpで検索", item.selfListing.searchUrl, "search")}
          ${actionLink("セラーハックスで確認", item.selfListing.sellerHacksUrl, "external-link")}
        </div>
      </div>
    </section>

    <section class="memo-panel">
      <div class="card-title">
        <i data-lucide="notebook-tabs" aria-hidden="true"></i>
        <h3>メモ</h3>
      </div>
      <p>${escapeHtml(item.aiNote || "AI考察は未入力です")}</p>
      <p>${escapeHtml(review.memo || item.reviewMemo || item.manualMemo || item.improvementMemo || "目視メモはまだありません")}</p>
      ${
        hasReviewRefreshRequest(review)
          ? `<p class="refresh-preview-note">情報再取得: ${escapeHtml(review.refreshReason || "理由未入力")} ${escapeHtml(review.refreshReferenceUrl || defaultRefreshReferenceUrl(item))}</p>`
          : ""
      }
    </section>

    <footer class="source-foot">
      <span>データ元: ${escapeHtml(state.meta.sourceSheetName || "還付込利益判定")}</span>
      <a href="${escapeAttribute(state.meta.sourceSpreadsheetUrl || "#")}" target="_blank" rel="noreferrer">Google Sheets</a>
      <a href="${escapeAttribute(item.hts.referenceUrl || "#")}" target="_blank" rel="noreferrer">HTS確認</a>
    </footer>
  `;
  bindPreviewActions(item);
}

function renderRightSidebar() {
  if (!el.rightSidebar) return;
  const item = state.items.find((entry) => entry.id === state.selectedId);
  if (!item) {
    el.rightSidebar.innerHTML = `
      <section class="side-section empty-side-section">
        <div class="card-title">
          <i data-lucide="link" aria-hidden="true"></i>
          <h3>リンク</h3>
        </div>
        <p class="side-note">商品を選択するとリンクを表示します。</p>
      </section>
    `;
    return;
  }
  const sourcingLinks = getSourcingLinks(item);
  const sourcing = calculateSourcingTarget(item);
  const purchaseGap = calculatePurchaseGap(sourcing);
  el.rightSidebar.innerHTML = `
    <section class="side-section sourcing-target-section">
      <div class="card-title">
        <i data-lucide="calculator" aria-hidden="true"></i>
        <h3>仕入れ上限</h3>
      </div>
      <div class="sourcing-target-card">
        <span>利益率10%に必要な仕入れ上限</span>
        <strong>${sourcing.maxPurchasePriceJpy === null ? "未計算" : formatYen(sourcing.maxPurchasePriceJpy)}</strong>
        <small>関税込み利益 / 還付見込み込み</small>
      </div>
      <dl class="side-metric-list">
        ${detailRow("現仕入", sourcing.currentPurchasePriceJpy === null ? "未取得" : formatYen(sourcing.currentPurchasePriceJpy))}
        ${detailRow("上限差額", purchaseGap === null ? "未計算" : formatSignedYen(purchaseGap))}
        ${detailRow("現利益率", sourcing.currentProfitAfterDutyRate === null ? "未計算" : formatPercent(sourcing.currentProfitAfterDutyRate))}
        ${detailRow("目標利益", sourcing.targetProfitAfterDutyJpy === null ? "未計算" : formatYen(sourcing.targetProfitAfterDutyJpy))}
      </dl>
      <p class="side-note">上限差額がマイナスの場合は、値下げ交渉か入札上限の見直しが必要です。</p>
    </section>

    <section class="side-section">
      <div class="side-section-head">
        <div class="card-title">
          <i data-lucide="shopping-bag" aria-hidden="true"></i>
          <h3>仕入れ用リンク</h3>
        </div>
        <button class="open-all-links" type="button" data-copy-sourcing-links>
          <i data-lucide="copy" aria-hidden="true"></i>
          <span>URL一括コピー</span>
        </button>
      </div>
      <p class="side-note">国内仕入れ候補を探すためのリンクです。ヤフオクは上限金額をURLに反映します。</p>
      <div class="link-grid side-link-grid">
        ${sourcingLinks.map((link) => actionLink(link.label, link.url, link.icon)).join("")}
      </div>
    </section>

    <section class="side-section sold-compare-section">
      <div class="card-title">
        <i data-lucide="bar-chart-3" aria-hidden="true"></i>
        <h3>Sold比較</h3>
      </div>
      <div class="sold-compare-grid">
        ${soldCompareCard("ライバル", getCompetitorSoldTotal(item), "SellerHacks/競合累積")}
        ${soldCompareCard("自分", getSelfSoldTotal(item), selfSoldSourceLabel(item))}
      </div>
      <p class="side-note">自分のSoldは出品スナップショットやSellerHacks CSV投入後に精度が上がります。</p>
    </section>

    <section class="side-section glossary-section">
      <div class="card-title">
        <i data-lucide="book-open-text" aria-hidden="true"></i>
        <h3>語句メモ</h3>
      </div>
      <dl class="glossary-list">
        ${glossaryRow("Flex S", "Stiff。硬めのシャフト。一般的にヘッドスピードが速い人向け。")}
        ${glossaryRow("Flex R", "Regular。標準的なしなり。Sよりやわらかい。")}
        ${glossaryRow("ロフト角", "9.0 / 10.5などの度数。ドライバーヘッドの打ち出し角に関わる。")}
        ${glossaryRow("RH / LH", "Right Hand / Left Hand。右利き用・左利き用。")}
        ${glossaryRow("5-PW / 6pc", "5番からPWまで、6本セットという意味。")}
        ${glossaryRow("HC / Wrench", "ヘッドカバー / 調整レンチ。付属有無を確認する。")}
      </dl>
    </section>

    <section class="side-section side-help-section">
      <div class="card-title">
        <i data-lucide="info" aria-hidden="true"></i>
        <h3>操作メモ</h3>
      </div>
      <p class="side-note">未保存の目視判断はブラウザ内に残りますが、スプシへ反映するには左上の一括保存が必要です。</p>
      <p class="side-note">情報再取得は、競合価格やSold数が違う時に依頼として残す項目です。</p>
      <p class="side-note">リンク集がポップアップで開けない時は、URL一覧をクリップボードへコピーします。</p>
    </section>
  `;
  bindRightSidebarActions(item);
}

function selectItem(itemId) {
  if (!itemId || state.selectedId === itemId) return;
  state.selectedId = itemId;
  render();
}

function handleKeyboardNavigation(event) {
  const focusShortcut = (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey;
  if (focusShortcut && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
    if (isTextEntryActive()) return;
    event.preventDefault();
    moveFocusZone(event.key === "ArrowRight" ? 1 : -1);
    return;
  }
  if (isTextEntryActive()) return;
  if (event.shiftKey && !event.metaKey && !event.altKey && event.key === "ArrowDown") {
    event.preventDefault();
    moveSelection(1);
    return;
  }
  if (event.shiftKey && !event.metaKey && !event.altKey && event.key === "ArrowUp") {
    event.preventDefault();
    moveSelection(-1);
    return;
  }
  if (event.shiftKey && !event.metaKey && !event.altKey && event.key === "ArrowRight") {
    event.preventDefault();
    cycleReviewDecision(1);
    return;
  }
  if (event.shiftKey && !event.metaKey && !event.altKey && event.key === "ArrowLeft") {
    event.preventDefault();
    cycleReviewDecision(-1);
  }
}

function isTextEntryActive() {
  const tag = document.activeElement?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || document.activeElement?.isContentEditable;
}

function moveSelection(delta) {
  const items = getVisibleItems();
  if (!items.length) return;
  const currentIndex = Math.max(0, items.findIndex((item) => item.id === state.selectedId));
  const nextIndex = Math.min(Math.max(currentIndex + delta, 0), items.length - 1);
  selectItem(items[nextIndex].id);
}

function moveFocusZone(direction) {
  const zoneOrder = ["left", "main", "right"];
  const zones = zoneOrder
    .map((name) => document.querySelector(`[data-focus-zone="${name}"]`))
    .filter((node) => node && !node.hidden);
  if (!zones.length) return;
  const activeZone = document.activeElement?.closest?.("[data-focus-zone]");
  const currentIndex = zones.indexOf(activeZone);
  const fallbackIndex = direction > 0 ? -1 : 0;
  const nextIndex = (currentIndex >= 0 ? currentIndex : fallbackIndex) + direction;
  const nextZone = zones[(nextIndex + zones.length) % zones.length];
  nextZone.focus({ preventScroll: true });
  nextZone.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function cycleReviewDecision(direction) {
  const item = state.items.find((entry) => entry.id === state.selectedId);
  if (!item) return;
  const review = getReview(item.id);
  const currentIndex = HUMAN_DECISIONS.indexOf(review.decision);
  const baseIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (baseIndex + direction + HUMAN_DECISIONS.length) % HUMAN_DECISIONS.length;
  updateReview(item.id, { decision: HUMAN_DECISIONS[nextIndex] });
}

function scrollSelectedRowIntoView() {
  window.requestAnimationFrame(() => {
    el.productList.querySelector(".product-row.is-active")?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  });
}

async function reloadSharedReviewsFromSheet() {
  if (state.reviewDirty.size) {
    const confirmed = window.confirm(
      "未保存の目視判断があります。スプシから再読込すると画面上の未保存変更は上書きされます。続けますか？",
    );
    if (!confirmed) return;
  }

  setReviewReloadButtonLoading(true);
  setReviewSync(state.selectedId, {
    type: "saving",
    label: "スプシ再読込中",
    icon: "loader-circle",
  });

  try {
    const linkResult = await loadSharedItemLinksFromSheet({ showStatus: true });
    const reviewResult = await loadSharedReviewsFromSheet({ showStatus: true });
    initializeDirtyReviews();
    const failedParts = [
      linkResult.loaded ? "" : "商品URL",
      reviewResult.loaded ? "" : "目視",
    ].filter(Boolean);
    setReviewSync(state.selectedId, {
      type: failedParts.length ? "error" : "saved",
      label: failedParts.length
        ? `スプシ再読込失敗 ${failedParts.join(" / ")}`
        : `スプシ再読込済み 商品URL ${formatNumber(linkResult.applied)}件 / 目視 ${formatNumber(reviewResult.applied)}件`,
      icon: failedParts.length ? "cloud-alert" : "cloud-check",
    });
    render();
  } finally {
    setReviewReloadButtonLoading(false);
  }
}

async function loadSharedItemLinksFromSheet(options = {}) {
  const showStatus = Boolean(options.showStatus);
  if (!state.meta.sourceSpreadsheetId || !state.meta.sourceSheetName) {
    return { loaded: false, applied: 0 };
  }

  try {
    const payload = await postJson(REVIEW_SAVE_URL, {
      mode: "research-link-load",
      sourceSpreadsheetId: state.meta.sourceSpreadsheetId,
      sourceSheetName: state.meta.sourceSheetName,
    });
    if (!payload.configured) throw new Error(payload.message || "スプシ接続未設定");
    if (!payload.loaded || !payload.links) throw new Error(payload.error || "商品URL読込失敗");

    const incoming = Array.isArray(payload.links)
      ? payload.links
      : Object.values(payload.links);
    let applied = 0;
    const linkById = new Map(
      incoming
        .map((entry) => [String(entry?.itemId || ""), normalizeEbayItemUrl(entry?.competitorItemUrl)])
        .filter(([itemId, url]) => itemId && url),
    );
    state.items = state.items.map((item) => {
      const competitorItem = linkById.get(item.id);
      if (!competitorItem) return item;
      applied += 1;
      return {
        ...item,
        links: {
          ...(item.links || {}),
          competitorItem,
        },
      };
    });
    state.sheetLinkCount = applied;
    if (showStatus) {
      setReviewSync(state.selectedId, {
        type: applied ? "saved" : "idle",
        label: applied ? `商品URL読込済み ${formatNumber(applied)}件` : "商品URL更新なし",
        icon: "cloud-check",
      });
    }
    return { loaded: true, applied };
  } catch (error) {
    if (showStatus) {
      setReviewSync(state.selectedId, {
        type: "error",
        label: error.message || "商品URL再読込失敗",
        icon: "cloud-alert",
      });
    }
    return { loaded: false, applied: 0 };
  }
}

async function loadSharedReviewsFromSheet(options = {}) {
  const showStatus = Boolean(options.showStatus);
  if (!state.meta.sourceSpreadsheetId || !state.meta.sourceSheetName) {
    if (showStatus) {
      setReviewSync(state.selectedId, {
        type: "error",
        label: "スプシ情報がありません",
        icon: "cloud-alert",
      });
    }
    return { loaded: false, applied: 0 };
  }
  try {
    const payload = await postJson(REVIEW_SAVE_URL, {
      mode: "research-review-load",
      sourceSpreadsheetId: state.meta.sourceSpreadsheetId,
      sourceSheetName: state.meta.sourceSheetName,
    });
    if (!payload.configured) throw new Error(payload.message || "スプシ接続未設定");
    if (!payload.loaded || !payload.reviews) throw new Error(payload.error || "スプシ読込失敗");

    const incoming = Array.isArray(payload.reviews)
      ? payload.reviews
      : Object.values(payload.reviews);
    let applied = 0;
    for (const entry of incoming) {
      const item = findReviewItem(entry);
      if (!item) continue;
      const review = normalizeSharedReview(entry);
      state.reviews[item.id] = {
        ...review,
        syncedAt: review.syncedAt || review.updatedAt || "",
        syncedFingerprint: reviewFingerprint(review),
      };
      applied += 1;
    }
    if (!applied) {
      if (showStatus) {
        setReviewSync(state.selectedId, {
          type: "idle",
          label: "スプシ更新なし",
          icon: "cloud-check",
        });
      }
      return { loaded: true, applied: 0 };
    }
    saveReviews();
    setReviewSync(state.selectedId, {
      type: "saved",
      label: `${showStatus ? "スプシ再読込済み" : "スプシ読込済み"} ${formatNumber(applied)}件`,
      icon: "cloud-check",
    });
    return { loaded: true, applied };
  } catch (error) {
    if (showStatus) {
      setReviewSync(state.selectedId, {
        type: "error",
        label: error.message || "スプシ再読込失敗",
        icon: "cloud-alert",
      });
    } else {
      setReviewSync(state.selectedId, {
        type: "idle",
        label: "スプシ読込は未確認",
        icon: "cloud",
      });
    }
    return { loaded: false, applied: 0 };
  }
}

function findReviewItem(entry) {
  const itemId = String(entry?.itemId || "").trim();
  const itemNo = String(entry?.itemNo || "").trim();
  return state.items.find((item) => {
    if (itemId && item.id === itemId) return true;
    return itemNo && String(item.no) === itemNo;
  });
}

function normalizeSharedReview(entry) {
  const refreshReason = String(entry?.refreshReason ?? "");
  const refreshReferenceUrl = String(entry?.refreshReferenceUrl ?? "");
  return {
    decision: normalizeHumanDecision(entry?.decision || "未判断"),
    memo: String(entry?.memo ?? ""),
    refreshRequested: Boolean(
      truthyValue(entry?.refreshRequested) || refreshReason || refreshReferenceUrl,
    ),
    refreshReason,
    refreshReferenceUrl,
    updatedAt: String(entry?.updatedAt || entry?.syncedAt || ""),
    syncedAt: String(entry?.syncedAt || ""),
  };
}

function loadReviews() {
  try {
    const payload = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) || "{}");
    return payload && typeof payload === "object" ? payload : {};
  } catch {
    return {};
  }
}

function saveReviews() {
  localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(state.reviews));
}

function getReview(itemId) {
  const item = state.items.find((entry) => entry.id === itemId);
  const review = state.reviews[itemId] || {};
  const fallbackDecision = normalizeHumanDecision(item?.visualDecision || item?.manualDecision || "未判断");
  const fallbackMemo = String(item?.manualMemo ?? "");
  const decision = HUMAN_DECISIONS.includes(review.decision) ? review.decision : fallbackDecision;
  const memo = String(review.memo ?? fallbackMemo);
  const refreshReason = String(review.refreshReason ?? item?.refreshReason ?? "");
  const refreshReferenceUrl = String(review.refreshReferenceUrl ?? item?.refreshReferenceUrl ?? "");
  const refreshRequested = Boolean(review.refreshRequested || refreshReason || refreshReferenceUrl || item?.refreshRequested);
  const fallbackSyncedFingerprint =
    item && (fallbackDecision !== "未判断" || fallbackMemo)
      ? reviewFingerprint({ decision: fallbackDecision, memo: fallbackMemo })
      : "";
  return {
    decision,
    memo,
    refreshRequested,
    refreshReason,
    refreshReferenceUrl,
    updatedAt: review.updatedAt || "",
    syncedFingerprint: String(review.syncedFingerprint || fallbackSyncedFingerprint),
    syncedAt: review.syncedAt || "",
  };
}

function updateReview(itemId, patch, options = {}) {
  const current = getReview(itemId);
  state.reviews[itemId] = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  saveReviews();
  markReviewDirty(itemId);
  syncSelection();
  if (options.rerender !== false) render();
}

function initializeDirtyReviews() {
  state.reviewDirty.clear();
  for (const item of state.items) {
    const stored = state.reviews[item.id];
    if (!stored) continue;
    const review = getReview(item.id);
    if (!hasLocalReviewValue(review)) continue;
    if (review.syncedFingerprint !== reviewFingerprint(review)) {
      state.reviewDirty.add(item.id);
    }
  }
}

function markReviewDirty(itemId) {
  const review = getReview(itemId);
  if (review.syncedFingerprint && review.syncedFingerprint === reviewFingerprint(review)) {
    state.reviewDirty.delete(itemId);
    setReviewSync(itemId, {
      type: "saved",
      label: "スプシ保存済み",
      icon: "cloud-check",
    });
    return;
  }
  state.reviewDirty.add(itemId);
  setReviewSync(itemId, dirtyReviewStatus());
}

async function saveDirtyReviewsToSheet() {
  const dirtyItems = [...state.reviewDirty]
    .map((itemId) => state.items.find((item) => item.id === itemId))
    .filter(Boolean);
  if (!dirtyItems.length) {
    setReviewSync(state.selectedId, { type: "idle", label: "未保存の変更はありません", icon: "cloud-check" });
    return;
  }

  const selectedId = state.selectedId;
  setAllDirtyReviewSync({ type: "saving", label: `一括保存中 ${formatNumber(dirtyItems.length)}件`, icon: "loader-circle" });
  try {
    const payload = await postJson(REVIEW_SAVE_URL, {
      mode: "research-review-batch",
      sourceSpreadsheetId: state.meta.sourceSpreadsheetId,
      sourceSheetName: state.meta.sourceSheetName,
      reviews: dirtyItems.map((item) => {
        const review = getReview(item.id);
        return {
          itemId: item.id,
          itemNo: item.no,
          title: item.title,
          decision: review.decision,
          memo: review.memo,
          refreshRequested: hasReviewRefreshRequest(review),
          refreshReason: review.refreshReason,
          refreshReferenceUrl: review.refreshReferenceUrl || defaultRefreshReferenceUrl(item),
        };
      }),
    });
    if (!payload.saved) throw new Error(payload.message || "スプシへ保存できませんでした");
    const savedIds = new Set(
      Array.isArray(payload.savedItems)
        ? payload.savedItems.map((entry) => String(entry.itemId || "")).filter(Boolean)
        : dirtyItems.map((item) => item.id),
    );
    const errorById = new Map(
      Array.isArray(payload.errors)
        ? payload.errors.map((entry) => [String(entry.itemId || ""), String(entry.error || "保存できませんでした")])
        : [],
    );
    for (const item of dirtyItems) {
      if (!savedIds.has(item.id)) {
        setReviewSync(item.id, {
          type: "error",
          label: errorById.get(item.id) || "保存できませんでした",
          icon: "cloud-alert",
        });
        continue;
      }
      const review = getReview(item.id);
      state.reviews[item.id] = {
        ...review,
        syncedAt: new Date().toISOString(),
        syncedFingerprint: reviewFingerprint(review),
      };
      state.reviewDirty.delete(item.id);
      setReviewSync(item.id, {
        type: "saved",
        label: "スプシ保存済み",
        icon: "cloud-check",
      });
    }
    saveReviews();
    renderReviewSaveButton();
    const errorCount = errorById.size;
    setReviewSync(selectedId, {
      type: errorCount ? "error" : "saved",
      label: errorCount
        ? `一部保存失敗: 成功${formatNumber(savedIds.size)}件 / 失敗${formatNumber(errorCount)}件`
        : `一括保存済み ${formatNumber(payload.savedCount || dirtyItems.length)}件`,
      icon: errorCount ? "cloud-alert" : "cloud-check",
    });
  } catch (error) {
    setReviewSync(selectedId, {
      type: "error",
      label: `一括保存失敗: ${error.message}`,
      icon: "cloud-alert",
    });
  }
}

function setAllDirtyReviewSync(status) {
  for (const itemId of state.reviewDirty) {
    setReviewSync(itemId, status);
  }
}

function setReviewSync(itemId, status) {
  state.reviewSync[itemId] = {
    ...status,
    updatedAt: new Date().toISOString(),
  };
  if (itemId === state.selectedId) renderReviewSyncStatus(itemId);
}

function getReviewSync(itemId) {
  const status = state.reviewSync[itemId];
  if (status?.type === "saving" || status?.type === "error") return status;
  if (state.reviewDirty.has(itemId)) return dirtyReviewStatus();
  if (state.reviewDirty.size) {
    return { type: "idle", label: `未保存 ${formatNumber(state.reviewDirty.size)}件あり`, icon: "cloud" };
  }
  if (status) return status;
  return { type: "idle", label: "未保存なし", icon: "cloud-check" };
}

function renderReviewSyncStatus(itemId) {
  const node = el.reviewEditor.querySelector("#reviewSyncStatus");
  if (!node) return;
  const sync = getReviewSync(itemId);
  node.className = `review-sync-status ${sync.type}`;
  node.innerHTML = `
    <i data-lucide="${escapeAttribute(sync.icon)}" aria-hidden="true"></i>
    <span>${escapeHtml(sync.label)}</span>
  `;
  renderReviewSaveButton();
  renderIcons();
}

function renderReviewSaveButton() {
  const button = el.reviewSaveButton;
  if (!button) return;
  button.disabled = state.reviewDirty.size === 0;
  button.innerHTML = `
    <i data-lucide="cloud-upload" aria-hidden="true"></i>
    ${escapeHtml(reviewSaveButtonLabel())}
  `;
}

function setReviewReloadButtonLoading(isLoading) {
  const button = el.reviewReloadButton;
  if (!button) return;
  button.disabled = Boolean(isLoading);
  button.innerHTML = `
    <i data-lucide="${isLoading ? "loader-circle" : "refresh-cw"}" aria-hidden="true"></i>
    ${isLoading ? "再読込中" : "スプシ再読込"}
  `;
  renderIcons();
}

function reviewSaveButtonLabel() {
  const count = state.reviewDirty.size;
  return count ? `未保存${formatNumber(count)}件を一括スプシ保存` : "未保存なし";
}

function dirtyReviewStatus() {
  return {
    type: "dirty",
    label: `未保存 ${formatNumber(state.reviewDirty.size)}件`,
    icon: "cloud-upload",
  };
}

function hasLocalReviewValue(review) {
  return Boolean(review.memo) || review.decision !== "未判断" || hasReviewRefreshRequest(review);
}

function reviewFingerprint(review) {
  return JSON.stringify({
    decision: normalizeHumanDecision(review.decision),
    memo: String(review.memo || ""),
    refreshRequested: hasReviewRefreshRequest(review),
    refreshReason: String(review.refreshReason || ""),
    refreshReferenceUrl: String(review.refreshReferenceUrl || ""),
  });
}

function hasReviewRefreshRequest(review) {
  return Boolean(review?.refreshRequested || review?.refreshReason || review?.refreshReferenceUrl);
}

function getVisibleItems() {
  const query = state.query;
  const filtered = state.items.filter((item) => {
    if (state.decision !== "all" && item.decision !== state.decision) return false;
    if (state.reviewStatus !== "all" && getReviewStatus(item) !== state.reviewStatus) return false;
    if (state.shippingClass !== "all" && item.logistics.shippingClass !== state.shippingClass) return false;
    if (!query) return true;
    return [
      item.title,
      item.ebayKeyword,
      item.domesticKeyword,
      item.category,
      item.hts.code,
      item.hts.label,
    ].some((value) => String(value || "").toLowerCase().includes(query));
  });

  return [...filtered].sort((a, b) => {
    if (state.sort === "profit") return b.profit.profitJpy - a.profit.profitJpy;
    if (state.sort === "dutyProfit") return b.profit.profitAfterDutyJpy - a.profit.profitAfterDutyJpy;
    if (state.sort === "sold") return getSoldSortValue(b) - getSoldSortValue(a);
    if (state.sort === "price") return b.pricing.ebayTotalUsd - a.pricing.ebayTotalUsd;
    return a.no - b.no;
  });
}

function getReviewStatus(item) {
  return isReviewComplete(item) ? "done" : "pending";
}

function isReviewComplete(item) {
  return getReview(item.id).decision !== "未判断";
}

function getSoldSortValue(item) {
  return numericOrNull(getTerapeakSold30(item)) ?? numericOrNull(getCompetitorSoldTotal(item)) ?? 0;
}

function getTerapeakSold30(item) {
  return firstPresent([
    item.terapeakSold30,
    item.productResearchSold30,
    item.sold30Terapeak,
    item.soldMetrics?.terapeak30,
  ]);
}

function getCompetitorSoldTotal(item) {
  return firstPresent([
    item.competitorSoldTotal,
    item.competitorCumulativeSold,
    item.itemSoldTotal,
    item.sellerItemSold,
    item.soldMetrics?.competitorCumulative,
    item.sold30,
  ]);
}

function getSelfSoldTotal(item) {
  return firstPresent([
    item.selfSoldTotal,
    item.selfCumulativeSold,
    item.ownSoldTotal,
    item.mySoldTotal,
    item.soldMetrics?.selfCumulative,
    item.soldMetrics?.ownCumulative,
    item.selfListing?.soldTotal,
    item.selfListing?.soldCount,
  ]);
}

function selfSoldSourceLabel(item) {
  return numericOrNull(getSelfSoldTotal(item)) === null
    ? "自社データ未取得"
    : item.selfListing?.seller || state.meta.seller || "自社";
}

function firstPresent(values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function numericOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function truthyValue(value) {
  if (value === true) return true;
  const text = String(value || "").trim().toLowerCase();
  return ["1", "true", "yes", "y", "on", "checked", "ok", "◯", "○", "〇"].includes(text);
}

function formatSoldCount(value) {
  const number = numericOrNull(value);
  return number === null ? "未取得" : formatNumber(number);
}

function metricCard(label, value, sub) {
  return `
    <div class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(sub)}</small>
    </div>
  `;
}

function soldCompareCard(label, value, sub) {
  return `
    <div class="sold-compare-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(formatSoldCount(value))}</strong>
      <small>${escapeHtml(sub)}</small>
    </div>
  `;
}

function getPreviewSources(item) {
  const exactItemUrl = getExactEbayItemUrl(item);
  return (item.previewSources || []).map((source) => {
    if (source.key !== "makse" || !exactItemUrl) return source;
    return {
      ...source,
      url: exactItemUrl,
      note: "Opens exact eBay item page",
    };
  });
}

function getExactEbayItemUrl(item) {
  return firstPresent(
    [
      item.competitorItemUrl,
      item.ebayItemUrl,
      item.itemUrl,
      item.links?.competitorItem,
      item.links?.ebayItem,
      item.links?.item,
      item.links?.competitor,
    ].map(normalizeEbayItemUrl),
  ) || "";
}

function normalizeEbayItemUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const itemUrlMatch = text.match(/\/itm\/(?:[^/?#]+\/)?(\d{10,15})/i);
  if (itemUrlMatch) return `https://www.ebay.com/itm/${itemUrlMatch[1]}`;
  if (/^\d{10,15}$/.test(text)) return `https://www.ebay.com/itm/${text}`;
  return "";
}

function getListingResearchLinks(item) {
  return dedupeLinks([
    ["eBay商品ページ", getExactEbayItemUrl(item), "external-link"],
    ["eBay競合", item.links?.competitor, "external-link"],
    ["Product Research", item.links?.productResearch, "bar-chart-3"],
    ["makse", item.links?.makse, "store"],
    ["eBay KW Ship to US", item.links?.ebayKeywordResearchShipToUs, "ship"],
    ["Yahooオークション", item.links?.yahooAuction, "gavel"],
    ["メルカリ", item.links?.mercari, "shopping-bag"],
    ["楽天", item.links?.rakuten, "shopping-cart"],
    ["Amazon", item.links?.amazon, "package"],
    ["Google", item.links?.google, "search"],
    ["専門検索", item.links?.specialist, "scan-search"],
    ["HTS参照", item.hts?.referenceUrl, "file-search"],
  ]);
}

function getSourcingLinks(item) {
  const cap = calculateSourcingTarget(item).maxPurchasePriceJpy;
  return dedupeLinks([
    ["ヤフオク仕入れ", buildSourcingUrl("yahooAuction", item, cap), "gavel"],
    ["楽天仕入れ", buildSourcingUrl("rakuten", item, cap), "shopping-cart"],
    ["Yahoo!ショッピング", buildSourcingUrl("yahooShopping", item, cap), "shopping-bag"],
    ["ゴルフパートナー", buildSourcingUrl("golfPartner", item, cap), "store"],
    ["ゴルフ・ドゥ", buildSourcingUrl("golfDo", item, cap), "store"],
    ["Google仕入れ検索", buildSourcingUrl("google", item, cap), "search"],
  ]);
}

function getConfirmLinks(item) {
  return getSourcingLinks(item);
}

function dedupeLinks(links) {
  const seen = new Set();
  return links
    .filter(([, url]) => url)
    .map(([label, url, icon]) => ({ label, url, icon }))
    .filter((link) => {
      const key = `${link.label}::${link.url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function defaultRefreshReferenceUrl(item) {
  return getExactEbayItemUrl(item) || item?.links?.makse || item?.links?.competitor || item?.links?.ebaySearch || "";
}

function domesticSearchCapText(item) {
  return item.pricing?.domesticSearchMaxJpy
    ? `検索上限 ${formatYen(item.pricing.domesticSearchMaxJpy)}`
    : "";
}

function domesticSearchLinkLabel(label, item) {
  const cap = domesticSearchCapText(item);
  return cap ? `${label}(${cap})` : label;
}

function domesticSearchQuery(item) {
  return item.domesticKeyword || item.ebayKeyword || item.title || "";
}

function encodeSearchQuery(value, options = {}) {
  const encoded = encodeURIComponent(String(value || "").trim());
  return options.plusSpaces ? encoded.replaceAll("%20", "+") : encoded;
}

function buildSourcingUrl(type, item, maxPurchasePriceJpy) {
  const query = domesticSearchQuery(item);
  const plusQuery = encodeSearchQuery(query, { plusSpaces: true });
  const pathQuery = encodeSearchQuery(query);
  const googleQuery = encodeSearchQuery(query);
  const maxPrice = numericOrNull(maxPurchasePriceJpy);
  if (type === "yahooAuction") {
    return `https://auctions.yahoo.co.jp/search/search?p=${plusQuery}${maxPrice ? `&aucmaxprice=${Math.floor(maxPrice)}` : ""}`;
  }
  if (type === "rakuten") return `https://search.rakuten.co.jp/search/mall/${pathQuery}/`;
  if (type === "yahooShopping") return `https://shopping.yahoo.co.jp/search?p=${plusQuery}`;
  if (type === "golfPartner") return `https://www.google.com/search?q=${googleQuery}%20site%3Agolfpartner.jp`;
  if (type === "golfDo") return `https://www.google.com/search?q=${googleQuery}%20site%3Agolfdo.com`;
  return item.links?.google || `https://www.google.com/search?q=${googleQuery}`;
}

function bindRightSidebarActions(item) {
  const copyButton = el.rightSidebar?.querySelector("[data-copy-sourcing-links]");
  copyButton?.addEventListener("click", async () => {
    await copyConfirmLinks(getSourcingLinks(item), copyButton);
  });
}

function bindPreviewActions(item) {
  const copyButton = el.productPreview?.querySelector("[data-copy-research-links]");
  copyButton?.addEventListener("click", async () => {
    await copyConfirmLinks(getListingResearchLinks(item), copyButton);
  });
}

async function openConfirmLinkHub(item, button) {
  const links = getConfirmLinks(item);
  const storageKey = `ebayConfirmLinks:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      no: item.no || "",
      title: item.title || "仕入れ確認リンク",
      links,
      mode: "sourcing",
      keyword: domesticSearchQuery(item),
      sourcing: calculateSourcingTarget(item),
      createdAt: new Date().toISOString(),
    }),
  );
  const hub = window.open(`./ebay-confirm-links.html?key=${encodeURIComponent(storageKey)}`, "_blank", "noopener");
  if (!hub) {
    await copyConfirmLinks(links, button);
    return;
  }
}

function calculateSourcingTarget(item) {
  const targetRate = SOURCING_TARGET_PROFIT_RATE;
  const domesticPrice = numericOrNull(item.pricing?.domesticPriceJpy);
  const orderEarning = numericOrNull(item.profit?.orderEarningJpy);
  const logistics = numericOrNull(item.logistics?.totalLogisticsJpy);
  const currentTaxRefund = numericOrNull(item.profit?.taxRefundJpy);
  const dutyRate = numericOrNull(item.profit?.dutyRate) ?? 0;
  const taxRefundRate = domesticPrice && currentTaxRefund !== null
    ? currentTaxRefund / domesticPrice
    : 10 / 110;
  const fixedEarning = orderEarning !== null && logistics !== null ? orderEarning - logistics : null;
  const denominator = 1 + dutyRate + targetRate - taxRefundRate;
  const maxPurchasePriceJpy = fixedEarning !== null && denominator > 0
    ? Math.floor(fixedEarning / denominator)
    : null;
  const targetProfitAfterDutyJpy = maxPurchasePriceJpy !== null
    ? Math.round(profitAfterDutyForPurchase(maxPurchasePriceJpy, {
        fixedEarning,
        taxRefundRate,
        dutyRate,
      }))
    : null;
  const currentProfitAfterDutyJpy = numericOrNull(item.profit?.profitAfterDutyJpy);
  const currentProfitAfterDutyRate = domesticPrice && currentProfitAfterDutyJpy !== null
    ? currentProfitAfterDutyJpy / domesticPrice
    : numericOrNull(item.profit?.profitAfterDutyRate);
  return {
    targetProfitRate: targetRate,
    maxPurchasePriceJpy,
    targetProfitAfterDutyJpy,
    currentPurchasePriceJpy: domesticPrice,
    currentProfitAfterDutyJpy,
    currentProfitAfterDutyRate,
    orderEarningJpy: orderEarning,
    logisticsTotalJpy: logistics,
    dutyRate,
    taxRefundRate,
  };
}

function calculatePurchaseGap(sourcing) {
  if (sourcing.maxPurchasePriceJpy === null || sourcing.currentPurchasePriceJpy === null) return null;
  return sourcing.maxPurchasePriceJpy - sourcing.currentPurchasePriceJpy;
}

function profitAfterDutyForPurchase(purchasePriceJpy, { fixedEarning, taxRefundRate, dutyRate }) {
  return fixedEarning + purchasePriceJpy * taxRefundRate - purchasePriceJpy - purchasePriceJpy * dutyRate;
}

async function copyConfirmLinks(links, button) {
  const text = links.map((link) => link.url).join("\n");
  try {
    await copyTextToClipboard(text);
    setOpenButtonLabel(button, "URLをコピーしました");
  } catch {
    showCopyFallback(button, text);
    setOpenButtonLabel(button, "URLを表示しました");
  }
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back to a temporary textarea for browsers that block Clipboard API.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("copy failed");
}

function showCopyFallback(button, text) {
  const container = button?.closest(".info-card, .side-section, .link-panel");
  if (!container) return;
  container.querySelector(".copy-fallback-box")?.remove();
  const box = document.createElement("div");
  box.className = "copy-fallback-box";
  box.innerHTML = `
    <p>コピーできない場合は、このURL一覧を選択してコピーしてください。</p>
    <textarea readonly rows="4"></textarea>
  `;
  const textarea = box.querySelector("textarea");
  textarea.value = text;
  container.appendChild(box);
  textarea.focus({ preventScroll: true });
  textarea.select();
}

function setOpenButtonLabel(button, label) {
  const labelNode = button?.querySelector("span");
  if (!labelNode) return;
  const previous = labelNode.textContent || "リンク集を開く";
  labelNode.textContent = label;
  window.setTimeout(() => {
    labelNode.textContent = previous;
  }, 1800);
}

function previewTile({ label, title, url, note }) {
  const tagName = url ? "a" : "span";
  const linkAttrs = url
    ? `href="${escapeAttribute(url)}" target="_blank" rel="noreferrer"`
    : `aria-disabled="true"`;
  return `
    <div class="preview-tile">
      <${tagName} class="preview-tile-main" ${linkAttrs}>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(title)}</strong>
        ${note ? `<small>${escapeHtml(note)}</small>` : ""}
      </${tagName}>
    </div>
  `;
}

function detailRow(label, value) {
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `;
}

function glossaryRow(label, value) {
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </div>
  `;
}

function displayCategory(value) {
  return String(value || "")
    .replaceAll("高爾夫球用具", "ゴルフ用品")
    .replaceAll("高爾夫", "ゴルフ");
}

function actionLink(label, url, icon) {
  if (!url) {
    return `<span class="action-link is-disabled"><i data-lucide="${icon}" aria-hidden="true"></i>${escapeHtml(label)}</span>`;
  }
  return `
    <a class="action-link" href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">
      <i data-lucide="${icon}" aria-hidden="true"></i>
      ${escapeHtml(label)}
    </a>
  `;
}

function getDuplicateCheck(item) {
  if (item.duplicateCheck?.status) return item.duplicateCheck;
  if (item.selfListing?.status === "出品済み") {
    return {
      status: "重複あり",
      matchType: "既存出品ステータス",
      title: item.selfListing.matchedTitle || "",
      url: item.selfListing.matchedUrl || "",
      note: "既存出品として照合されています。",
    };
  }
  if (item.selfListing?.status === "候補一致") {
    return {
      status: "類似あり",
      matchType: "候補一致",
      title: item.selfListing.matchedTitle || "",
      url: item.selfListing.matchedUrl || "",
      note: "類似候補があります。",
    };
  }
  return {
    status: "未照合",
    matchType: "",
    title: "",
    url: "",
    note: "Sheets接続後、既存Activeマスターと自動照合します。",
  };
}

function getListingLabel(status) {
  if (status === "出品済み") return "出品済";
  if (status === "候補一致") return "候補";
  return "未照合";
}

function decisionClass(value) {
  if (value === "◯") return "ok";
  if (value === "△") return "warn";
  if (value === "✗") return "ng";
  return "hold";
}

function normalizeHumanDecision(value) {
  if (value === "○") return "◯";
  if (value === "×") return "✗";
  return HUMAN_DECISIONS.includes(value) ? value : "未判断";
}

function duplicateClass(status) {
  if (status === "重複なし") return "ok";
  if (status === "類似あり") return "warn";
  if (status === "重複あり") return "ng";
  return "hold";
}

function shortDuplicateStatus(status) {
  if (status === "重複なし") return "なし";
  if (status === "類似あり") return "類似";
  if (status === "重複あり") return "重複";
  return "未照合";
}

function shortDecision(value) {
  return value === "未判断" ? "未" : value;
}

function formatNumber(value) {
  return new Intl.NumberFormat("ja-JP").format(Number(value || 0));
}

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value || 0));
}

function formatYen(value) {
  return `¥${new Intl.NumberFormat("ja-JP").format(Math.round(Number(value || 0)))}`;
}

function formatSignedYen(value) {
  const number = Number(value || 0);
  const prefix = number > 0 ? "+" : number < 0 ? "-" : "";
  return `${prefix}${formatYen(Math.abs(number))}`;
}

function formatPercent(value) {
  return `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 1 }).format(Number(value || 0) * 100)}%`;
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatReviewUpdated(value) {
  if (!value) return "未入力";
  return formatDateTime(value);
}

function renderIcons() {
  if (window.lucide) window.lucide.createIcons();
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
