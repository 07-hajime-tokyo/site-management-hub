const API = {
  sources: "./api/listing-sources",
  import: "./api/listing-import",
  queue: "./api/listing-queue",
  status: "./api/listing-status",
};
const CHECKLIST_STORAGE_KEY = "ebayListingPrepChecklist:v1";
const SELLSTA_URL = "https://sellsta.jp/listings?filtering=pending_listings&ebay_site=US";
const CHECK_ITEMS = [
  ["duplicate", "重複/類似確認", "既存Activeと型番・状態・付属品を確認"],
  ["title", "タイトル80文字", "同一タイトルを避け、主要KWを残す"],
  ["condition", "型番・状態・付属品", "記載ミスがクレームになりやすい箇所"],
  ["price", "予定価格", "競合・直近Sold・送料を見て確認"],
  ["supplier", "仕入URL", "在庫・価格・写真利用可否を確認"],
  ["photos", "写真候補", "同一写真が並び過ぎないか確認"],
  ["specifics", "Item specifics", "ブランド・型番・カテゴリ属性を確認"],
  ["description", "説明文", "状態と同梱物がタイトルと矛盾しないか確認"],
  ["draft", "Sellsta下書き保存", "実出品ボタンは押さない"],
];

const state = {
  configured: false,
  sources: [],
  items: [],
  selectedId: "",
  query: "",
  status: "all",
  busy: false,
  lastImport: null,
  checklist: loadChecklist(),
};

const el = {
  sourceBox: document.querySelector("#sourceBox"),
  sourceSummary: document.querySelector("#sourceSummary"),
  importButton: document.querySelector("#importButton"),
  refreshButton: document.querySelector("#refreshButton"),
  queueSearch: document.querySelector("#queueSearch"),
  statusFilter: document.querySelector("#statusFilter"),
  resultLine: document.querySelector("#resultLine"),
  queueList: document.querySelector("#queueList"),
  emptyState: document.querySelector("#emptyState"),
  itemWorkspace: document.querySelector("#itemWorkspace"),
};

init();

async function init() {
  bindEvents();
  await Promise.all([loadSources(), loadQueue()]);
  render();
}

function bindEvents() {
  el.importButton.addEventListener("click", importApprovedRows);
  el.refreshButton.addEventListener("click", refreshData);
  el.queueSearch.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    syncSelection();
    render();
  });
  el.statusFilter.addEventListener("change", (event) => {
    state.status = event.target.value;
    syncSelection();
    render();
  });
}

async function refreshData() {
  state.busy = true;
  renderButtons();
  await Promise.all([loadSources(), loadQueue()]);
  state.busy = false;
  render();
  toast("更新しました");
}

async function loadSources() {
  try {
    const data = await fetchJson(API.sources);
    state.configured = Boolean(data.configured);
    state.sources = data.sources || [];
  } catch (error) {
    state.configured = false;
    state.sources = [];
  }
}

async function loadQueue() {
  try {
    const data = await fetchJson(API.queue);
    state.configured = Boolean(data.configured);
    state.items = data.items || [];
    state.selectedId = state.selectedId || state.items[0]?.id || "";
    syncSelection();
  } catch {
    state.items = [];
    state.selectedId = "";
  }
}

async function importApprovedRows() {
  state.busy = true;
  renderButtons();
  try {
    state.lastImport = await postJson(API.import, {});
    await loadQueue();
    render();
    const imported = Number(state.lastImport.imported || 0);
    const updated = Number(state.lastImport.updated || 0);
    toast(`取り込み完了: 新規${imported} / 更新${updated}`);
  } catch (error) {
    toast(`取り込み失敗: ${error.message}`);
  } finally {
    state.busy = false;
    renderButtons();
  }
}

function render() {
  renderSources();
  renderList();
  renderWorkspace();
  renderButtons();
  renderIcons();
}

function renderSources() {
  const enabled = state.sources.filter((source) => source.enabled);
  el.sourceBox.classList.toggle("is-warning", !state.configured);
  if (!state.configured) {
    el.sourceSummary.textContent = "Vercel環境変数の設定待ち";
    return;
  }
  el.sourceSummary.textContent = `${enabled.length}件有効 / ${state.sources.length}件登録`;
}

function renderButtons() {
  el.importButton.disabled = state.busy || !state.configured;
  el.refreshButton.disabled = state.busy;
}

function renderList() {
  const items = visibleItems();
  el.resultLine.textContent = `${formatNumber(items.length)}件表示 / 全${formatNumber(state.items.length)}件`;
  if (!state.configured) {
    el.resultLine.textContent = "Google Sheets接続待ち";
  }
  el.queueList.innerHTML = items
    .map((item) => {
      const active = item.id === state.selectedId ? " is-active" : "";
      return `
        <button class="queue-row${active}" type="button" data-id="${escapeAttribute(item.id)}">
          <span class="queue-main">
            <strong>${escapeHtml(item.title || "タイトル未設定")}</strong>
            <span>${escapeHtml(item.sellerName || "source")} #${escapeHtml(item.sourceRow || item.rowNumber)} ・ ${escapeHtml(item.keyword || "KW未設定")}</span>
            <span class="queue-badges">
              ${badge(item.duplicateStatus || "未判定", duplicateClass(item.duplicateStatus))}
              ${badge(item.workStatus || "未着手", "gold")}
            </span>
          </span>
          <span class="badge hold">$${escapeHtml(item.priceUsd || "--")}</span>
        </button>
      `;
    })
    .join("");

  el.queueList.querySelectorAll("[data-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = button.dataset.id || "";
      render();
    });
  });
}

function renderWorkspace() {
  const item = state.items.find((entry) => entry.id === state.selectedId);
  if (!item) {
    el.emptyState.hidden = false;
    el.itemWorkspace.hidden = true;
    el.emptyState.innerHTML = `
      <i data-lucide="${state.configured ? "folder-search" : "key-round"}" aria-hidden="true"></i>
      <p>${state.configured ? "キューに商品がありません" : "Google Sheets環境変数の設定待ちです"}</p>
    `;
    return;
  }

  el.emptyState.hidden = true;
  el.itemWorkspace.hidden = false;
  const title = listingTitle(item);
  const description = buildDescription(item);
  const specifics = buildSpecifics(item);
  const checklist = state.checklist[item.id] || {};
  const doneCount = CHECK_ITEMS.filter(([key]) => checklist[key]).length;

  el.itemWorkspace.innerHTML = `
    <header class="workspace-head">
      <div class="title-block">
        <span class="status-row">
          ${badge(item.duplicateStatus || "未判定", duplicateClass(item.duplicateStatus))}
          ${badge(item.workStatus || "未着手", "gold")}
          ${badge(`${doneCount}/${CHECK_ITEMS.length} checked`, doneCount === CHECK_ITEMS.length ? "ok" : "hold")}
        </span>
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.sellerName || "source")} / row ${escapeHtml(item.sourceRow || item.rowNumber)}</p>
      </div>
      <div class="head-actions">
        <a class="primary-button" href="${SELLSTA_URL}" target="_blank" rel="noreferrer">
          <i data-lucide="external-link" aria-hidden="true"></i>
          Sellstaを開く
        </a>
        ${linkButton("仕入URL", item.supplierUrl, "shopping-cart")}
        ${linkButton("参考eBay", item.ebayReference || item.existingUrl, "badge-dollar-sign")}
        ${linkButton("日本スペック", item.exactSearchUrl, "search")}
      </div>
    </header>

    <div class="workspace-grid">
      <section class="work-section">
        <div class="info-card">
          <div class="card-title">
            <i data-lucide="scan-search" aria-hidden="true"></i>
            <h3>重複判定</h3>
          </div>
          <dl class="detail-list">
            ${detailRow("判定", item.duplicateStatus || "未判定")}
            ${detailRow("一致タイプ", item.matchType || "未照合")}
            ${detailRow("既存Item ID", item.existingItemId || "なし")}
            ${detailRow("既存タイトル", item.existingTitle || "なし")}
            ${detailRow("推奨", item.recommendedAction || "確認待ち")}
          </dl>
          <div class="link-row">
            ${linkButton("既存出品を開く", item.existingUrl, "external-link")}
          </div>
        </div>

        <div class="info-card">
          <div class="card-title">
            <i data-lucide="package-check" aria-hidden="true"></i>
            <h3>商品情報</h3>
          </div>
          <dl class="detail-list">
            ${detailRow("タイトル", item.title)}
            ${detailRow("ブランド", item.brand || "未入力")}
            ${detailRow("型番/KW", item.keyword || "未入力")}
            ${detailRow("状態", item.condition || "未確認")}
            ${detailRow("予定価格", item.priceUsd ? `$${item.priceUsd}` : "未入力")}
            ${detailRow("メモ", item.memo || "なし")}
          </dl>
        </div>

        <div class="info-card">
          <div class="card-title">
            <i data-lucide="image" aria-hidden="true"></i>
            <h3>写真候補</h3>
          </div>
          <div class="link-row">
            ${linkButton("仕入先写真", item.supplierUrl, "image")}
            ${linkButton("競合写真", item.exactSearchUrl || item.ebayReference || item.existingUrl, "images")}
            ${linkButton("市場一覧で被り確認", item.ebayReference, "images")}
            ${linkButton("Product Research", productResearchUrl(item), "bar-chart-3")}
          </div>
        </div>
      </section>

      <section class="work-section">
        <div class="info-card">
          <div class="card-title">
            <i data-lucide="list-checks" aria-hidden="true"></i>
            <h3>チェックリスト</h3>
          </div>
          <div class="check-list">
            ${CHECK_ITEMS.map(([key, label, note]) => checkItem(item.id, key, label, note, Boolean(checklist[key]))).join("")}
          </div>
        </div>
      </section>

      <section class="work-section">
        <div class="info-card">
          <div class="card-title">
            <i data-lucide="copy-check" aria-hidden="true"></i>
            <h3>Sellsta転記</h3>
          </div>
          <label class="text-output">
            <span class="field-label">タイトル ${title.length}/80</span>
            <textarea readonly id="listingTitle">${escapeHtml(title)}</textarea>
          </label>
          <div class="copy-row">
            <button class="copy-button" type="button" data-copy-target="listingTitle">
              <i data-lucide="copy" aria-hidden="true"></i>
              タイトルをコピー
            </button>
          </div>
          <label class="text-output">
            <span class="field-label">説明文</span>
            <textarea readonly id="listingDescription">${escapeHtml(description)}</textarea>
          </label>
          <div class="copy-row">
            <button class="copy-button" type="button" data-copy-target="listingDescription">
              <i data-lucide="copy" aria-hidden="true"></i>
              説明文をコピー
            </button>
          </div>
          <label class="text-output">
            <span class="field-label">Item specifics</span>
            <textarea readonly id="itemSpecifics">${escapeHtml(specifics)}</textarea>
          </label>
          <div class="copy-row">
            <button class="copy-button" type="button" data-copy-target="itemSpecifics">
              <i data-lucide="copy" aria-hidden="true"></i>
              Specificsをコピー
            </button>
          </div>
        </div>

        <div class="info-card">
          <div class="card-title">
            <i data-lucide="save" aria-hidden="true"></i>
            <h3>下書き保存結果</h3>
          </div>
          <label class="select-field">
            <span>作業ステータス</span>
            <select id="workStatus">
              ${["未着手", "下書き準備中", "下書き作成済み", "要確認"].map((status) => `<option value="${escapeAttribute(status)}"${status === item.workStatus ? " selected" : ""}>${escapeHtml(status)}</option>`).join("")}
            </select>
          </label>
          <label class="input-field">
            <span class="field-label">Sellsta listing ID</span>
            <input id="sellstaListingId" value="${escapeAttribute(item.sellstaListingId)}" placeholder="例: 12345" />
          </label>
          <label class="input-field">
            <span class="field-label">Sellsta URL</span>
            <input id="sellstaUrl" value="${escapeAttribute(item.sellstaUrl)}" placeholder="https://sellsta.jp/..." />
          </label>
          <label class="input-field">
            <span class="field-label">確認メモ</span>
            <textarea id="statusMemo">${escapeHtml(item.memo)}</textarea>
          </label>
          <button class="primary-button" id="saveDraftButton" type="button">
            <i data-lucide="save" aria-hidden="true"></i>
            下書き保存済みにする
          </button>
        </div>
      </section>
    </div>
  `;

  el.itemWorkspace.querySelectorAll("[data-check-key]").forEach((input) => {
    input.addEventListener("change", () => {
      updateChecklist(item.id, input.dataset.checkKey || "", input.checked);
      renderWorkspace();
      renderIcons();
    });
  });
  el.itemWorkspace.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", () => copyField(button.dataset.copyTarget || ""));
  });
  el.itemWorkspace.querySelector("#saveDraftButton").addEventListener("click", () => saveDraftStatus(item));
}

async function saveDraftStatus(item) {
  const payload = {
    rowNumber: item.rowNumber,
    sourceId: item.sourceId,
    sourceRow: item.sourceRow,
    status: document.querySelector("#workStatus").value,
    sellstaListingId: document.querySelector("#sellstaListingId").value.trim(),
    sellstaUrl: document.querySelector("#sellstaUrl").value.trim(),
    memo: document.querySelector("#statusMemo").value.trim(),
  };
  if (payload.status === "未着手" && (payload.sellstaListingId || payload.sellstaUrl)) {
    payload.status = "下書き作成済み";
  }
  try {
    const data = await postJson(API.status, payload);
    if (!data.saved) throw new Error(data.message || "保存できませんでした");
    await loadQueue();
    render();
    toast("中央Sheetへ保存しました");
  } catch (error) {
    toast(`保存失敗: ${error.message}`);
  }
}

function visibleItems() {
  const query = state.query;
  return state.items.filter((item) => {
    if (state.status !== "all" && item.workStatus !== state.status) return false;
    if (!query) return true;
    return [item.title, item.keyword, item.sellerName, item.sourceId, item.workStatus]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });
}

function syncSelection() {
  const items = visibleItems();
  if (!items.some((item) => item.id === state.selectedId)) {
    state.selectedId = items[0]?.id || "";
  }
}

function updateChecklist(itemId, key, checked) {
  if (!key) return;
  state.checklist[itemId] = {
    ...(state.checklist[itemId] || {}),
    [key]: checked,
  };
  saveChecklist();
}

function loadChecklist() {
  try {
    const value = JSON.parse(localStorage.getItem(CHECKLIST_STORAGE_KEY) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function saveChecklist() {
  localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(state.checklist));
}

function listingTitle(item) {
  const source = String(item.title || "").replace(/\s+/g, " ").trim();
  if (source.length <= 80) return source;
  const tokens = source.split(" ");
  const result = [];
  for (const token of tokens) {
    const next = [...result, token].join(" ");
    if (next.length > 80) break;
    result.push(token);
  }
  return result.join(" ") || source.slice(0, 80);
}

function buildDescription(item) {
  return [
    listingTitle(item),
    "",
    `Condition: ${item.condition || "Used"}`,
    item.keyword ? `Model / keyword: ${item.keyword}` : "",
    item.brand ? `Brand: ${item.brand}` : "",
    "",
    "Please check the photos and item specifics before purchase.",
    "Accessories are only those shown or described.",
    "Ships from Japan with tracking.",
    "",
    item.memo ? `Internal check note: ${item.memo}` : "",
  ]
    .filter((line, index, lines) => line || lines[index - 1] !== "")
    .join("\n");
}

function buildSpecifics(item) {
  return [
    `Brand: ${item.brand || "See title"}`,
    `Model / keyword: ${item.keyword || "See title"}`,
    `Condition: ${item.condition || "Used"}`,
    `Price USD: ${item.priceUsd || ""}`,
    `Source row: ${item.sourceId || ""} ${item.sourceRow || ""}`.trim(),
  ].join("\n");
}

function productResearchUrl(item) {
  const keyword = item.keyword || item.title || "";
  if (!keyword) return "";
  return `https://www.ebay.com/sh/research?marketplace=EBAY-US&keywords=${encodeURIComponent(keyword)}&dayRange=90&categoryId=0&offset=0&limit=50&tabName=SOLD&tz=Asia%2FTokyo`;
}

function checkItem(itemId, key, label, note, checked) {
  return `
    <label class="check-item">
      <input type="checkbox" data-check-key="${escapeAttribute(key)}"${checked ? " checked" : ""} />
      <span class="check-copy">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(note)}</span>
      </span>
    </label>
  `;
}

function detailRow(label, value) {
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value || "未入力")}</dd>
    </div>
  `;
}

function linkButton(label, url, icon) {
  if (!url) return "";
  return `
    <a class="link-button" href="${escapeAttribute(url)}" target="_blank" rel="noreferrer">
      <i data-lucide="${escapeAttribute(icon)}" aria-hidden="true"></i>
      ${escapeHtml(label)}
    </a>
  `;
}

function badge(label, type) {
  return `<span class="badge ${escapeAttribute(type || "hold")}">${escapeHtml(label)}</span>`;
}

function duplicateClass(status) {
  if (status === "重複なし") return "ok";
  if (status === "類似あり") return "warn";
  if (status === "重複あり") return "ng";
  return "hold";
}

async function fetchJson(url) {
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload;
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

async function copyField(targetId) {
  const target = document.querySelector(`#${CSS.escape(targetId)}`);
  if (!target) return;
  try {
    await navigator.clipboard.writeText(target.value || target.textContent || "");
    toast("コピーしました");
  } catch {
    target.select?.();
    document.execCommand("copy");
    toast("コピーしました");
  }
}

function toast(message) {
  const current = document.querySelector(".toast");
  current?.remove();
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  window.setTimeout(() => node.remove(), 2600);
}

function formatNumber(value) {
  return new Intl.NumberFormat("ja-JP").format(Number(value || 0));
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
