const DATA_URL = "./data/ebay-research-dashboard.json?v=20260607-1";
const REVIEW_STORAGE_KEY = "ebayResearchManualReviews:v1";
const HUMAN_DECISIONS = ["未判断", "◯", "△", "✗"];

const state = {
  items: [],
  meta: {},
  reviews: {},
  selectedId: "",
  query: "",
  decision: "all",
  shippingClass: "all",
  sort: "sheet",
};

const el = {
  summaryTotal: document.querySelector("#summaryTotal"),
  summaryOk: document.querySelector("#summaryOk"),
  summaryMaybe: document.querySelector("#summaryMaybe"),
  summaryNo: document.querySelector("#summaryNo"),
  productSearch: document.querySelector("#productSearch"),
  classFilter: document.querySelector("#classFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  reviewEditor: document.querySelector("#reviewEditor"),
  resultLine: document.querySelector("#resultLine"),
  productList: document.querySelector("#productList"),
  loadingState: document.querySelector("#loadingState"),
  productPreview: document.querySelector("#productPreview"),
};

init();

async function init() {
  state.reviews = loadReviews();
  bindEvents();
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.items = data.items || [];
    state.meta = data.meta || {};
    state.selectedId = state.items[0]?.id || "";
    render();
  } catch (error) {
    el.loadingState.innerHTML = `
      <i data-lucide="circle-alert" aria-hidden="true"></i>
      <p>データを読み込めませんでした</p>
    `;
    renderIcons();
  }
}

function bindEvents() {
  el.productSearch.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    syncSelection();
    render();
  });

  document.querySelectorAll("[data-filter='decision']").forEach((button) => {
    button.addEventListener("click", () => {
      state.decision = button.dataset.value || "all";
      syncSelection();
      render();
    });
  });

  el.classFilter.addEventListener("change", (event) => {
    state.shippingClass = event.target.value;
    syncSelection();
    render();
  });

  el.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    syncSelection();
    render();
  });

  document.addEventListener("keydown", handleKeyboardNavigation);
}

function syncSelection() {
  const visible = getVisibleItems();
  if (!visible.some((item) => item.id === state.selectedId)) {
    state.selectedId = visible[0]?.id || "";
  }
}

function render() {
  renderSummary();
  renderReviewEditor();
  renderList();
  renderPreview();
  renderFilterButtons();
  renderIcons();
  scrollSelectedRowIntoView();
}

function renderSummary() {
  const counts = state.items.reduce((acc, item) => {
    acc[item.decision] = (acc[item.decision] || 0) + 1;
    return acc;
  }, {});
  el.summaryTotal.textContent = formatNumber(state.items.length);
  el.summaryOk.textContent = formatNumber(counts["◯"] || 0);
  el.summaryMaybe.textContent = formatNumber(counts["△"] || 0);
  el.summaryNo.textContent = formatNumber(counts["✗"] || 0);
}

function renderFilterButtons() {
  document.querySelectorAll("[data-filter='decision']").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.value === state.decision);
  });
  el.classFilter.value = state.shippingClass;
  el.sortSelect.value = state.sort;
}

function renderList() {
  const items = getVisibleItems();
  el.resultLine.textContent = `${formatNumber(items.length)}件表示 / ${formatDateTime(state.meta.generatedAt)} 更新`;
  el.productList.innerHTML = items
    .map((item) => {
      const active = item.id === state.selectedId ? " is-active" : "";
      const listed = getListingLabel(item.selfListing.status);
      const review = getReview(item.id);
      return `
        <button class="product-row${active}" type="button" data-id="${escapeAttribute(item.id)}">
          <span class="decision-badge decision-${decisionClass(item.decision)}" aria-label="AI判断 ${escapeAttribute(item.decision)}">${escapeHtml(item.decision)}</span>
          <span class="product-row-main">
            <strong>${escapeHtml(item.title)}</strong>
            <span>
              Sold ${formatNumber(item.sold30)}・${escapeHtml(item.logistics.shippingClass)}・利益 ${formatYen(item.profit.profitAfterDutyJpy)}
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
    return;
  }

  const review = getReview(item.id);
  el.reviewEditor.innerHTML = `
    <div class="review-editor-head">
      <div>
        <span>目視判断</span>
        <strong>#${formatNumber(item.no)}</strong>
      </div>
      <span class="review-updated">${escapeHtml(formatReviewUpdated(review.updatedAt))}</span>
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
  `;

  el.reviewEditor.querySelectorAll("[data-review-decision]").forEach((button) => {
    button.addEventListener("click", () => {
      updateReview(item.id, { decision: button.dataset.reviewDecision || "未判断" });
    });
  });

  el.reviewEditor.querySelector("#manualReviewMemo").addEventListener("input", (event) => {
    updateReview(item.id, { memo: event.target.value }, { rerender: false });
    renderPreview();
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
  const competitorLabel = item.links.competitor === item.links.ebaySearch ? "競合検索" : "競合ページ";
  const review = getReview(item.id);
  el.productPreview.innerHTML = `
    <header class="preview-head">
      <div class="title-block">
        <span class="row-number">#${formatNumber(item.no)}</span>
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.category || "カテゴリ未設定")}</p>
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
      </div>
    </header>

    <section class="alert-line">
      <i data-lucide="info" aria-hidden="true"></i>
      <span>${escapeHtml(item.decisionReason || "判定理由は未入力です")}</span>
    </section>

    <section class="metric-grid" aria-label="主要指標">
      ${metricCard("競合価格", `$${formatUsd(item.pricing.ebayTotalUsd)}`, formatYen(item.pricing.ebayTotalJpy))}
      ${metricCard("30日Sold", formatNumber(item.sold30), "Product Research基準")}
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
          ${(item.previewSources || []).map((source) => previewTile(source)).join("")}
        </div>
      </div>

      <div class="info-card">
        <div class="card-title">
          <i data-lucide="list-checks" aria-hidden="true"></i>
          <h3>商品スペック</h3>
        </div>
        <dl class="detail-list">
          ${detailRow("構成", item.specs.component)}
          ${detailRow("クラブ種別", item.specs.clubType)}
          ${detailRow("利き手", item.specs.handedness)}
          ${detailRow("ロフト角", item.specs.loft)}
          ${detailRow("番手構成", `${item.specs.setComposition} / ${item.specs.pieceCount}`)}
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
          ${detailRow("東京→Oregon（忍者倉庫）", formatYen(item.logistics.ninjaToOregonJpy))}
          ${detailRow("Oregon→Buyer", formatYen(item.logistics.oregonToBuyerJpy))}
          ${detailRow("合計送料目安", formatYen(item.logistics.totalLogisticsJpy))}
          ${detailRow("梱包サイズ", item.packaging.size)}
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
          ${detailRow("国内仕入目安", formatYen(item.pricing.domesticPriceJpy))}
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
        <div class="button-row">
          ${actionLink("good-select-jpで検索", item.selfListing.searchUrl, "search")}
          ${actionLink("セラーハックスで確認", item.selfListing.sellerHacksUrl, "external-link")}
        </div>
      </div>
    </section>

    <section class="link-panel">
      <div class="card-title">
        <i data-lucide="link" aria-hidden="true"></i>
        <h3>確認リンク</h3>
      </div>
      <div class="link-grid">
        ${actionLink("eBay競合", item.links.competitor, "external-link")}
        ${actionLink("Product Research", item.links.productResearch, "bar-chart-3")}
        ${actionLink("makse", item.links.makse, "store")}
        ${actionLink("eBay KW Ship to US", item.links.ebayKeywordResearchShipToUs, "ship")}
        ${actionLink("Yahooオークション", item.links.yahooAuction, "gavel")}
        ${actionLink("メルカリ", item.links.mercari, "shopping-bag")}
        ${actionLink("楽天", item.links.rakuten, "shopping-cart")}
        ${actionLink("Amazon", item.links.amazon, "package")}
        ${actionLink("Google", item.links.google, "search")}
        ${actionLink("専門検索", item.links.specialist, "scan-search")}
        ${actionLink("HTS参照", item.hts.referenceUrl, "file-search")}
      </div>
    </section>

    <section class="memo-panel">
      <div class="card-title">
        <i data-lucide="notebook-tabs" aria-hidden="true"></i>
        <h3>メモ</h3>
      </div>
      <p>${escapeHtml(item.aiNote || "AI考察は未入力です")}</p>
      <p>${escapeHtml(review.memo || item.reviewMemo || item.manualMemo || item.improvementMemo || "目視メモはまだありません")}</p>
    </section>

    <footer class="source-foot">
      <span>データ元: ${escapeHtml(state.meta.sourceSheetName || "還付込利益判定")}</span>
      <a href="${escapeAttribute(state.meta.sourceSpreadsheetUrl || "#")}" target="_blank" rel="noreferrer">Google Sheets</a>
      <a href="${escapeAttribute(item.hts.referenceUrl || "#")}" target="_blank" rel="noreferrer">HTS確認</a>
    </footer>
  `;
}

function selectItem(itemId) {
  if (!itemId || state.selectedId === itemId) return;
  state.selectedId = itemId;
  render();
}

function handleKeyboardNavigation(event) {
  if (isTextEntryActive()) return;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveSelection(1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveSelection(-1);
    return;
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    cycleReviewDecision(1);
    return;
  }
  if (event.key === "ArrowLeft") {
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
  const review = state.reviews[itemId] || {};
  return {
    decision: HUMAN_DECISIONS.includes(review.decision) ? review.decision : "未判断",
    memo: String(review.memo || ""),
    updatedAt: review.updatedAt || "",
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
  if (options.rerender !== false) render();
}

function getVisibleItems() {
  const query = state.query;
  const filtered = state.items.filter((item) => {
    if (state.decision !== "all" && item.decision !== state.decision) return false;
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
    if (state.sort === "sold") return b.sold30 - a.sold30;
    if (state.sort === "price") return b.pricing.ebayTotalUsd - a.pricing.ebayTotalUsd;
    return a.no - b.no;
  });
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

function previewTile({ label, title, url, imageUrl, emptyText, note, links = [] }) {
  const image = imageUrl
    ? `<img src="${escapeAttribute(imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`
    : `<div class="image-placeholder"><i data-lucide="image-off" aria-hidden="true"></i><span>${escapeHtml(emptyText)}</span></div>`;
  const subLinks = links.length
    ? `<div class="preview-sub-links">${links.map((link) => `<a href="${escapeAttribute(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label)}</a>`).join("")}</div>`
    : "";
  return `
    <div class="preview-tile">
      <a class="preview-tile-main" href="${escapeAttribute(url || "#")}" target="_blank" rel="noreferrer" aria-disabled="${url ? "false" : "true"}">
        ${image}
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(title)}</strong>
        ${note ? `<small>${escapeHtml(note)}</small>` : ""}
      </a>
      ${subLinks}
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
