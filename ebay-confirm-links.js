const STORAGE_PREFIX = "ebayConfirmLinks:";

const el = {
  itemNo: document.querySelector("#itemNo"),
  itemTitle: document.querySelector("#itemTitle"),
  linkList: document.querySelector("#linkList"),
  urlList: document.querySelector("#urlList"),
  copyLinksButton: document.querySelector("#copyLinksButton"),
  profitSidebar: document.querySelector("#profitSidebar"),
};

init();

function init() {
  const payload = readPayload();
  render(payload);
  el.copyLinksButton.addEventListener("click", () => copyUrls(payload.links || []));
  document.addEventListener("keydown", handleKeyboardNavigation);
  window.lucide?.createIcons();
}

function handleKeyboardNavigation(event) {
  if (!event.metaKey || event.shiftKey || event.altKey || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  if (isTextEntryActive()) return;
  event.preventDefault();
  moveFocusZone(event.key === "ArrowRight" ? 1 : -1);
}

function isTextEntryActive() {
  const tag = document.activeElement?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || document.activeElement?.isContentEditable;
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

function readPayload() {
  const key = new URLSearchParams(window.location.search).get("key") || "";
  if (!key.startsWith(STORAGE_PREFIX)) return emptyPayload();
  try {
    const payload = JSON.parse(localStorage.getItem(key) || "{}");
    if (!Array.isArray(payload.links)) return emptyPayload();
    return {
      no: payload.no || "",
      title: payload.title || "確認リンク一覧",
      keyword: payload.keyword || "",
      mode: payload.mode || "research",
      sourcing: normalizeSourcing(payload.sourcing),
      links: payload.links.filter((link) => link?.label && link?.url),
    };
  } catch {
    return emptyPayload();
  }
}

function emptyPayload() {
  return {
    no: "",
    title: "確認リンクが見つかりません",
    keyword: "",
    mode: "research",
    sourcing: null,
    links: [],
  };
}

function render(payload) {
  el.itemNo.textContent = payload.no ? `#${payload.no} / 仕入れリンク` : "仕入れリンク";
  el.itemTitle.textContent = payload.title;
  el.urlList.value = payload.links.map((link) => link.url).join("\n");
  el.copyLinksButton.disabled = !payload.links.length;
  el.linkList.innerHTML = payload.links.length
    ? payload.links.map(linkRow).join("")
    : `<p class="empty-state">リサーチ判定ボードからリンク集を開き直してください。</p>`;
  renderProfitSidebar(payload);
}

function linkRow(link) {
  return `
    <a class="link-row" href="${escapeAttribute(link.url)}" target="_blank" rel="noreferrer">
      <strong>${escapeHtml(link.label)}</strong>
      <span>${escapeHtml(link.url)}</span>
    </a>
  `;
}

function renderProfitSidebar(payload) {
  if (!el.profitSidebar) return;
  const sourcing = payload.sourcing;
  if (!sourcing) {
    el.profitSidebar.innerHTML = `
      <p class="sidebar-eyebrow">仕入れ基準</p>
      <h2>利益データなし</h2>
      <p class="sidebar-note">リサーチ判定ボードから開き直すと12%ラインを表示します。</p>
    `;
    return;
  }
  el.profitSidebar.innerHTML = `
    <p class="sidebar-eyebrow">仕入れ基準</p>
    <h2>関税込利益 ${formatPercent(sourcing.targetProfitRate)} ライン</h2>
    <div class="profit-primary">
      <span>仕入れ価格上限</span>
      <strong>${formatYen(sourcing.maxPurchasePriceJpy)}</strong>
    </div>
    <div class="profit-grid">
      ${profitMetric("関税込み利益額", formatYen(sourcing.targetProfitAfterDutyJpy), "上限価格での目安")}
      ${profitMetric("現在の関税込利益", formatYen(sourcing.currentProfitAfterDutyJpy), formatPercent(sourcing.currentProfitAfterDutyRate))}
      ${profitMetric("現在の仕入目安", formatYen(sourcing.currentPurchasePriceJpy), "シート入力値")}
      ${profitMetric("物流合計", formatYen(sourcing.logisticsTotalJpy), "国内→Oregon→購入者")}
    </div>
    <dl class="profit-detail">
      <div>
        <dt>Order earning</dt>
        <dd>${formatYen(sourcing.orderEarningJpy)}</dd>
      </div>
      <div>
        <dt>関税率</dt>
        <dd>${formatPercent(sourcing.dutyRate)}</dd>
      </div>
      <div>
        <dt>還付率</dt>
        <dd>${formatPercent(sourcing.taxRefundRate)}</dd>
      </div>
    </dl>
    ${payload.keyword ? `<p class="sidebar-note">検索語: ${escapeHtml(payload.keyword)}</p>` : ""}
  `;
}

function profitMetric(label, value, sub) {
  return `
    <div class="profit-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(sub)}</small>
    </div>
  `;
}

async function copyUrls(links) {
  if (!links.length) return;
  try {
    await navigator.clipboard.writeText(links.map((link) => link.url).join("\n"));
    setCopyLabel("コピーしました");
  } catch {
    el.urlList.select();
    document.execCommand("copy");
    setCopyLabel("コピーしました");
  }
}

function setCopyLabel(label) {
  const previous = el.copyLinksButton.textContent.trim() || "URL一括コピー";
  el.copyLinksButton.textContent = label;
  window.setTimeout(() => {
    el.copyLinksButton.innerHTML = '<i data-lucide="copy" aria-hidden="true"></i>URL一括コピー';
    window.lucide?.createIcons();
  }, 1400);
}

function normalizeSourcing(value) {
  if (!value || typeof value !== "object") return null;
  return {
    targetProfitRate: numberOrNull(value.targetProfitRate),
    maxPurchasePriceJpy: numberOrNull(value.maxPurchasePriceJpy),
    targetProfitAfterDutyJpy: numberOrNull(value.targetProfitAfterDutyJpy),
    currentPurchasePriceJpy: numberOrNull(value.currentPurchasePriceJpy),
    currentProfitAfterDutyJpy: numberOrNull(value.currentProfitAfterDutyJpy),
    currentProfitAfterDutyRate: numberOrNull(value.currentProfitAfterDutyRate),
    orderEarningJpy: numberOrNull(value.orderEarningJpy),
    logisticsTotalJpy: numberOrNull(value.logisticsTotalJpy),
    dutyRate: numberOrNull(value.dutyRate),
    taxRefundRate: numberOrNull(value.taxRefundRate),
  };
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatYen(value) {
  const number = numberOrNull(value);
  return number === null
    ? "--"
    : new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0,
      }).format(number);
}

function formatPercent(value) {
  const number = numberOrNull(value);
  return number === null
    ? "--"
    : new Intl.NumberFormat("ja-JP", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(number);
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
  return escapeHtml(value).replaceAll("`", "&#096;");
}
