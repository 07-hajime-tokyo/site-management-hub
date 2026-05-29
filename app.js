const STORAGE_KEY = "manus-portal-tools-v1";
const RECENT_KEY = "manus-portal-recent-v1";
const PIN_OVERRIDES_KEY = "manus-portal-pin-overrides-v1";
const platformLabelOptions = ["01mur", "07haj", "talk"];

const typeLabels = {
  all: "すべて",
  site: "Webサイト",
  sheet: "スプレッドシート",
  doc: "ドキュメント",
  report: "レポート",
};

const typeOrder = ["site", "sheet", "doc", "report"];

const statusLabels = {
  active: "稼働中",
  review: "要確認",
  draft: "作成中",
  archived: "保管",
};

const categoryAccents = [
  "accent-blue",
  "accent-green",
  "accent-teal",
  "accent-amber",
  "accent-rose",
  "accent-violet",
];

const defaultTools = [
  {
    id: "invoice-stock",
    title: "インボイス管理・入出庫管理",
    url: "https://invoice-site-bycodex.vercel.app",
    repositoryUrl: "https://github.com/07-hajime-tokyo/invoice-site_byCodex",
    vercelUrl: "https://invoice-site-bycodex.vercel.app",
    category: "共有",
    type: "site",
    status: "active",
    pinned: true,
    description:
      "ゲーム機取引データの全文検索・フィルター・ソート。CSVをもとにインボイスや入出庫状況を確認。",
    tags: ["CSV", "入出庫", "インボイス"],
    createdAt: "2026-05-27T00:00:00.000Z",
    lastOpenedAt: "",
    openCount: 0,
  },
  {
    id: "retrogame-quote",
    title: "ゲーム機申請・見積もり",
    url: "https://retro-game-quote-by-codex.vercel.app",
    repositoryUrl: "https://github.com/07-hajime-tokyo/retro-game-quote_byCodex",
    vercelUrl: "https://retro-game-quote-by-codex.vercel.app",
    category: "共有",
    type: "site",
    status: "active",
    pinned: true,
    description:
      "レトロゲーム機の買取申請と見積もりを管理。入力から見積金額の確認までを扱う入口。",
    tags: ["申請", "見積もり", "買取"],
    createdAt: "2026-05-27T00:00:00.000Z",
    lastOpenedAt: "",
    openCount: 0,
  },
  {
    id: "market-research",
    title: "相場リサーチ",
    url: "https://gameresearch-e5yjsxcr.manus.space/?code=AJfBB54tjiqgg63Tu4BVqW",
    repositoryUrl: "",
    vercelUrl: "",
    category: "共有",
    type: "site",
    status: "active",
    pinned: false,
    description:
      "ヤフオク、メルカリ、駿河屋、Amazonなどの相場調査リンクをまとめて生成。",
    tags: ["相場", "AI比較", "検索"],
    createdAt: "2026-05-27T00:00:00.000Z",
    lastOpenedAt: "",
    openCount: 0,
  },
  {
    id: "chatwork-archive",
    title: "チャットワーク履歴",
    url: "https://chatworkdb-qcpunow9.manus.space",
    repositoryUrl: "https://github.com/07-hajime-tokyo/chatwork-history",
    vercelUrl: "",
    category: "共有",
    type: "site",
    status: "active",
    pinned: false,
    description:
      "Chatworkのメッセージ履歴をアーカイブし、必要な会話を検索して参照する管理画面。",
    tags: ["Chatwork", "履歴", "検索"],
    createdAt: "2026-05-27T00:00:00.000Z",
    lastOpenedAt: "",
    openCount: 0,
  },
  {
    id: "oem-import-report",
    title: "中国輸入",
    url: "https://oemreport-mj8kgbwb.manus.space",
    repositoryUrl: "",
    vercelUrl: "",
    category: "中国輸入",
    type: "report",
    status: "active",
    pinned: false,
    description:
      "Amazon OEMリサーチのプロセス、仕入れ候補、コスト試算を上司向けにまとめた要約。",
    tags: ["OEM", "中国輸入", "Amazon"],
    createdAt: "2026-05-27T00:00:00.000Z",
    lastOpenedAt: "",
    openCount: 0,
  },
];

const state = {
  personalTools: loadTools(),
  sharedTools: [],
  sharedLoaded: false,
  sharedLoading: false,
  sharedError: "",
  source: loadSource(),
  pinOverrides: loadPinOverrides(),
  recent: loadRecent(),
  category: "all",
  type: "all",
  query: "",
  view: "grid",
  sort: "manual",
  editingId: null,
  draggingSheet: null,
  draggingCard: null,
  openSheetGroups: new Set(),
};

const el = {
  sourceButtons: document.querySelectorAll("[data-source]"),
  sourceNote: document.querySelector("#sourceNote"),
  categoryNav: document.querySelector("#categoryNav"),
  typeNav: document.querySelector("#typeNav"),
  totalCount: document.querySelector("#totalCount"),
  siteCount: document.querySelector("#siteCount"),
  sheetCount: document.querySelector("#sheetCount"),
  reviewCount: document.querySelector("#reviewCount"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  toolGrid: document.querySelector("#toolGrid"),
  toolTable: document.querySelector("#toolTable"),
  tableWrap: document.querySelector("#tableWrap"),
  emptyState: document.querySelector("#emptyState"),
  quickGrid: document.querySelector("#quickGrid"),
  libraryTitle: document.querySelector("#libraryTitle"),
  resultNote: document.querySelector("#resultNote"),
  addButton: document.querySelector("#addButton"),
  importButton: document.querySelector("#importButton"),
  importFile: document.querySelector("#importFile"),
  exportButton: document.querySelector("#exportButton"),
  clearRecentButton: document.querySelector("#clearRecentButton"),
  toolDialog: document.querySelector("#toolDialog"),
  toolForm: document.querySelector("#toolForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  closeDialogButton: document.querySelector("#closeDialogButton"),
  cancelButton: document.querySelector("#cancelButton"),
  deleteButton: document.querySelector("#deleteButton"),
  categoryOptions: document.querySelector("#categoryOptions"),
  toast: document.querySelector("#toast"),
};

const formFields = {
  id: document.querySelector("#toolId"),
  title: document.querySelector("#toolTitle"),
  url: document.querySelector("#toolUrl"),
  platformLabel: document.querySelector("#toolPlatformLabel"),
  repositoryUrl: document.querySelector("#toolRepositoryUrl"),
  vercelUrl: document.querySelector("#toolVercelUrl"),
  tidbUrl: document.querySelector("#toolTidbUrl"),
  notionUrl: document.querySelector("#toolNotionUrl"),
  category: document.querySelector("#toolCategory"),
  type: document.querySelector("#toolType"),
  status: document.querySelector("#toolStatus"),
  description: document.querySelector("#toolDescription"),
};

render();
bindEvents();
if (state.source === "shared") {
  loadSharedTools();
}

function getBaseTools() {
  return state.source === "shared" ? state.sharedTools : state.personalTools;
}

function getTools() {
  return getBaseTools().map(applyPinOverride);
}

function setTools(tools) {
  if (state.source === "shared") {
    state.sharedTools = tools;
  } else {
    state.personalTools = tools;
  }
}

function isSharedMode() {
  return state.source === "shared";
}

function applyPinOverride(tool) {
  if (!isSharedMode() || !(tool.id in state.pinOverrides)) return tool;
  return { ...tool, pinned: state.pinOverrides[tool.id] };
}

function bindEvents() {
  el.sourceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.source = button.dataset.source;
      state.category = "all";
      state.type = "all";
      state.query = "";
      el.searchInput.value = "";
      render();
      if (state.source === "shared") {
        loadSharedTools();
      }
    });
  });

  el.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderLibrary();
  });

  el.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderLibrary();
  });

  window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      el.searchInput.focus();
    }
  });

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      renderLibrary();
      renderIcons();
    });
  });

  el.addButton.addEventListener("click", () => openDialog());
  el.closeDialogButton.addEventListener("click", closeDialog);
  el.cancelButton.addEventListener("click", closeDialog);

  el.toolForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveFromForm();
  });

  el.deleteButton.addEventListener("click", () => {
    if (isSharedMode()) {
      showToast("共有データはNotion側で編集します");
      return;
    }
    if (!state.editingId) return;
    const target = getTools().find((tool) => tool.id === state.editingId);
    if (!target) return;
    const confirmed = window.confirm(`「${target.title}」を削除しますか？`);
    if (!confirmed) return;
    setTools(getTools().filter((tool) => tool.id !== state.editingId));
    state.recent = state.recent.filter((id) => id !== state.editingId);
    persist();
    closeDialog();
    render();
    showToast("削除しました");
  });

  el.exportButton.addEventListener("click", exportData);
  el.importButton.addEventListener("click", () => el.importFile.click());
  el.importFile.addEventListener("change", importData);

  el.clearRecentButton.addEventListener("click", () => {
    state.recent = [];
    localStorage.setItem(RECENT_KEY, JSON.stringify(state.recent));
    renderQuickAccess();
    renderLibrary();
    showToast("最近開いた履歴を消しました");
  });

  formFields.url.addEventListener("input", () => {
    const value = formFields.url.value;
    if (value.includes("docs.google.com/spreadsheets")) {
      formFields.type.value = "sheet";
      applyDefaultCategoryForType();
    } else if (value.includes("docs.google.com/document")) {
      formFields.type.value = "doc";
    }
  });

  formFields.type.addEventListener("change", applyDefaultCategoryForType);
}

function render() {
  normalizeTools();
  updateSourceControls();
  renderMetrics();
  renderCategoryNav();
  renderTypeNav();
  renderCategoryOptions();
  renderQuickAccess();
  renderLibrary();
  renderIcons();
}

function updateSourceControls() {
  el.sourceButtons.forEach((button) => {
    const active = button.dataset.source === state.source;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  const shared = isSharedMode();
  el.importButton.disabled = shared;
  el.exportButton.disabled = shared;
  el.addButton.disabled = false;
  el.addButton.title = shared ? "共有データをNotionに追加します" : "";

  if (shared) {
    if (state.sharedLoading) {
      el.sourceNote.textContent = "共有データを読み込み中です。";
    } else if (state.sharedError) {
      el.sourceNote.textContent = state.sharedError;
    } else {
      el.sourceNote.textContent = "共有データを表示中です。";
    }
  } else {
    el.sourceNote.textContent = "ブラウザ保存のみ";
  }
}

function renderMetrics() {
  const tools = getTools();
  el.totalCount.textContent = tools.length;
  el.siteCount.textContent = tools.filter((tool) => tool.type === "site").length;
  el.sheetCount.textContent = tools.filter((tool) => tool.type === "sheet").length;
  el.reviewCount.textContent = tools.filter((tool) => tool.status === "review").length;
}

function renderCategoryNav() {
  const tools = getTools();
  const counts = countBy(tools, "category");
  const categories = getCategories();
  el.categoryNav.innerHTML = categories
    .map((category, index) => {
      const active = state.category === category ? " is-active" : "";
      const accent = getAccentClass(category, index);
      const count = counts[category] || 0;
      return `
        <button class="nav-button ${accent}${active}" type="button" data-category="${escapeAttribute(category)}">
          <span class="nav-dot" aria-hidden="true"></span>
          <span class="nav-name">${escapeHtml(category)}</span>
          <span class="nav-count">${count}</span>
        </button>
      `;
    })
    .join("");

  el.categoryNav.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = state.category === button.dataset.category ? "all" : button.dataset.category;
      renderCategoryNav();
      renderLibrary();
      renderIcons();
    });
  });
}

function renderTypeNav() {
  const types = typeOrder;
  const tools = getTools();
  const counts = countBy(tools, "type");
  el.typeNav.innerHTML = types
    .map((type) => {
      const active = state.type === type ? " is-active" : "";
      const count = counts[type] || 0;
      return `
        <button class="nav-button accent-teal${active}" type="button" data-type="${type}">
          <i data-lucide="${getTypeIcon(type)}" aria-hidden="true"></i>
          <span class="nav-name">${typeLabels[type]}</span>
          <span class="nav-count">${count}</span>
        </button>
      `;
    })
    .join("");

  el.typeNav.querySelectorAll("[data-type]").forEach((button) => {
    button.addEventListener("click", () => {
      state.type = state.type === button.dataset.type ? "all" : button.dataset.type;
      renderTypeNav();
      renderLibrary();
      renderIcons();
    });
  });
}

function renderCategoryOptions() {
  el.categoryOptions.innerHTML = getCategories()
    .map((category) => `<option value="${escapeAttribute(category)}"></option>`)
    .join("");
}

function renderQuickAccess() {
  const tools = getTools();
  const items = tools.filter((tool) => tool.pinned).slice(0, 4);

  if (items.length === 0) {
    el.quickGrid.innerHTML = "";
    el.quickGrid.hidden = true;
    renderIcons();
    return;
  }

  el.quickGrid.hidden = false;
  el.quickGrid.innerHTML = items
    .map((tool) => createToolCard(tool, true))
    .join("");
  bindCardActions(el.quickGrid);
  renderIcons();
}

function renderLibrary() {
  const filtered = getFilteredTools();
  el.libraryTitle.textContent = getLibraryTitle();
  el.resultNote.textContent = `${filtered.length}件`;
  const emptyText = el.emptyState.querySelector("p");
  if (emptyText) {
    if (isSharedMode() && state.sharedLoading) {
      emptyText.textContent = "Notionから読み込み中です";
    } else if (isSharedMode() && state.sharedError) {
      emptyText.textContent = state.sharedError;
    } else if (!isSharedMode()) {
      emptyText.textContent = "ブラウザ保存の登録はありません";
    } else {
      emptyText.textContent = "該当する登録はありません";
    }
  }
  el.emptyState.hidden = filtered.length > 0;
  el.toolGrid.hidden = state.view !== "grid" || filtered.length === 0;
  el.tableWrap.hidden = state.view !== "table" || filtered.length === 0;
  el.toolGrid.classList.toggle("is-sectioned", state.type === "all");
  el.sortSelect.value = state.sort;

  document.querySelectorAll("[data-view]").forEach((button) => {
    const active = button.dataset.view === state.view;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  if (state.view === "grid") {
    el.toolGrid.innerHTML =
      state.type === "all"
        ? createTypeSections(filtered)
        : state.type === "sheet"
        ? createSheetGroupCards(filtered)
        : filtered.map((tool) => createToolCard(tool)).join("");
    bindCardActions(el.toolGrid);
    bindCardDrag(el.toolGrid);
    bindSheetDrag(el.toolGrid);
    bindSheetGroupToggles(el.toolGrid);
  } else {
    el.toolTable.innerHTML = filtered.map(createTableRow).join("");
    bindCardActions(el.toolTable);
  }

  renderIcons();
}

function getLibraryTitle() {
  const sourcePrefix = isSharedMode() ? "" : "ブラウザ保存のみ";
  let title = "";

  if (state.type !== "all") {
    title = state.category === "all"
      ? typeLabels[state.type] || state.type
      : `${state.category} / ${typeLabels[state.type] || state.type}`;
  } else {
    title = state.category === "all" ? "種類別" : state.category;
  }

  if (!sourcePrefix) return title;
  return title === "種類別" ? sourcePrefix : `${sourcePrefix} / ${title}`;
}

function createTypeSections(tools) {
  return getVisibleTypes(tools)
    .map((type) => {
      const items = tools.filter((tool) => tool.type === type);
      const cards = type === "sheet"
        ? createSheetGroupCards(items)
        : items.map((tool) => createToolCard(tool)).join("");

      return `
        <section class="library-kind-section" data-type-section="${escapeAttribute(type)}">
          <div class="library-kind-heading">
            <div class="kind-heading-title">
              <span class="kind-heading-icon" aria-hidden="true">
                <i data-lucide="${getTypeIcon(type)}" aria-hidden="true"></i>
              </span>
              <h4>${escapeHtml(typeLabels[type] || type)}</h4>
            </div>
            <span>${items.length}件</span>
          </div>
          <div class="tool-grid-section">
            ${cards}
          </div>
        </section>
      `;
    })
    .join("");
}

function getVisibleTypes(tools) {
  const types = [...new Set(tools.map((tool) => tool.type || "site"))];
  const ordered = typeOrder.filter((type) => types.includes(type));
  const extras = types
    .filter((type) => !typeOrder.includes(type))
    .sort((a, b) => a.localeCompare(b, "ja"));
  return [...ordered, ...extras];
}

function createSheetGroupCards(tools) {
  const groups = groupByCategory(tools);
  return groups
    .map(([category, rawItems]) => {
      const items = [...rawItems].sort(compareSheetOrder);
      const accent = getAccentClass(category);
      const links = items
        .map((tool) => {
          return `
            <div class="sheet-group-row" data-id="${tool.id}" data-category="${escapeAttribute(category)}">
              <span class="sheet-drag-handle" draggable="true" aria-label="並び替え" role="button" tabindex="0">
                <i data-lucide="grip-vertical" aria-hidden="true"></i>
              </span>
              <a class="sheet-group-item" href="${escapeAttribute(tool.url)}" target="_blank" rel="noreferrer" data-action="open">
                <span>
                  <strong>${escapeHtml(tool.title)}</strong>
                </span>
                <i data-lucide="external-link" aria-hidden="true"></i>
              </a>
              <button class="icon-only sheet-group-pin ${tool.pinned ? "is-pinned" : ""}" type="button" data-action="pin" aria-label="${tool.pinned ? "固定を外す" : "固定する"}">
                <i data-lucide="pin" aria-hidden="true"></i>
              </button>
              <button class="icon-only sheet-group-edit" type="button" data-action="edit" aria-label="編集">
                <i data-lucide="pencil" aria-hidden="true"></i>
              </button>
            </div>
          `;
        })
        .join("");

      return `
        <article class="tool-card sheet-group-card ${accent}" data-card-key="sheet:${escapeAttribute(category)}" data-card-kind="sheet-group" data-card-type="sheet" data-card-category="${escapeAttribute(category)}" data-group="${escapeAttribute(category)}">
          <div class="sheet-group-head">
            <div class="sheet-group-title">
              <span class="card-icon" aria-hidden="true">
                <i data-lucide="folder" aria-hidden="true"></i>
              </span>
              <h4>${escapeHtml(category)}</h4>
            </div>
            <div class="sheet-group-controls">
              <span class="card-drag-handle" draggable="true" aria-label="カードを並び替え" role="button" tabindex="0">
                <i data-lucide="grip-vertical" aria-hidden="true"></i>
              </span>
              <span class="pill">${items.length}件</span>
            </div>
          </div>
          <details class="sheet-group-toggle" data-sheet-group="${escapeAttribute(category)}" ${isSheetGroupOpen(category) ? "open" : ""}>
            <summary>
              <span>${items.length === 1 ? "スプレッドシート" : "スプレッドシートを表示"}</span>
              <i data-lucide="chevron-down" aria-hidden="true"></i>
            </summary>
            <div class="sheet-group-list">
            ${links}
            </div>
          </details>
        </article>
      `;
    })
    .join("");
}

function createToolCard(tool, compact = false) {
  const accent = getAccentClass(tool.category);
  const platformLinks = createPlatformLinks(tool);
  return `
    <article class="tool-card ${compact ? "is-compact" : ""} ${accent}" data-id="${tool.id}" data-card-key="${escapeAttribute(tool.id)}" data-card-kind="tool" data-card-type="${escapeAttribute(tool.type)}">
      <div class="card-icon" aria-hidden="true">
        <i data-lucide="${getTypeIcon(tool.type)}" aria-hidden="true"></i>
      </div>
      <div class="card-info">
        <a class="card-text-link" href="${escapeAttribute(tool.url)}" target="_blank" rel="noreferrer" data-action="open">
          <h4>${escapeHtml(tool.title)}</h4>
        </a>
        ${platformLinks}
      </div>
      <div class="card-actions">
        ${compact ? "" : `
          <span class="card-drag-handle" draggable="true" aria-label="カードを並び替え" role="button" tabindex="0">
            <i data-lucide="grip-vertical" aria-hidden="true"></i>
          </span>
        `}
        <button class="icon-only ${tool.pinned ? "is-pinned" : ""}" type="button" data-action="pin" aria-label="${tool.pinned ? "固定を外す" : "固定する"}">
          <i data-lucide="pin" aria-hidden="true"></i>
        </button>
        <button class="icon-only" type="button" data-action="copy" aria-label="URLをコピー">
          <i data-lucide="copy" aria-hidden="true"></i>
        </button>
        <button class="icon-only" type="button" data-action="edit" aria-label="編集">
          <i data-lucide="pencil" aria-hidden="true"></i>
        </button>
      </div>
    </article>
  `;
}

function createPlatformLinks(tool) {
  const links = [
    createRepositoryLink(tool),
    createVercelLink(tool),
    createTidbLink(tool),
    createNotionLink(tool),
  ].filter(Boolean);
  if (!links.length) return "";
  return `
    <div class="platform-links">
      <span class="platform-label">${escapeHtml(normalizePlatformLabel(tool.platformLabel, tool))}</span>
      ${links.join("")}
    </div>
  `;
}

function createRepositoryLink(tool) {
  if (!tool.repositoryUrl) return "";
  return `
    <a class="platform-link repo-link" href="${escapeAttribute(tool.repositoryUrl)}" target="_blank" rel="noreferrer" aria-label="リポジトリを開く">
      <span class="platform-mark repo-mark" aria-hidden="true">
        <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
          <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.63 7.63 0 0 1 8 3.87c.68 0 1.36.09 2 .26 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"></path>
        </svg>
      </span>
    </a>
  `;
}

function createVercelLink(tool) {
  const vercelUrl = getVercelLinkUrl(tool);
  if (!vercelUrl) return "";
  return `
    <a class="platform-link vercel-link" href="${escapeAttribute(vercelUrl)}" target="_blank" rel="noreferrer" aria-label="Vercelを開く">
      <span class="platform-mark vercel-mark" aria-hidden="true">
        <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true">
          <path fill="currentColor" d="M8 1.5 16 14.5H0L8 1.5Z"></path>
        </svg>
      </span>
    </a>
  `;
}

function createNotionLink(tool) {
  if (!tool.notionUrl) return "";
  return `
    <a class="platform-link notion-link" href="${escapeAttribute(tool.notionUrl)}" target="_blank" rel="noreferrer" aria-label="Notionを開く">
      <span class="platform-mark notion-mark" aria-hidden="true">
        <img src="https://www.notion.so/images/favicon.ico" alt="" loading="lazy" referrerpolicy="no-referrer" />
      </span>
    </a>
  `;
}

function createTidbLink(tool) {
  if (!tool.tidbUrl) return "";
  return `
    <a class="platform-link tidb-link" href="${escapeAttribute(tool.tidbUrl)}" target="_blank" rel="noreferrer" aria-label="TiDB Cloudを開く">
      <span class="platform-mark tidb-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path fill="#e21d1d" d="M12 2.4 21 7.2v9.6l-9 4.8-9-4.8V7.2l9-4.8Z"></path>
          <path fill="#fff" d="M7.1 7.4h9.8v2.5h-3.3v7.1h-3.2V9.9H7.1V7.4Z"></path>
          <path fill="#fff" d="M16.1 11.1h2.3v5.9h-2.3v-5.9Z"></path>
        </svg>
      </span>
    </a>
  `;
}

function getVercelLinkUrl(tool) {
  const explicit = String(tool.vercelUrl || "").trim();
  if (explicit) return explicit;
  return isVercelUrl(tool.url) ? tool.url : "";
}

function normalizePlatformLabel(value, tool = {}) {
  const label = String(value || "").trim();
  if (platformLabelOptions.includes(label)) return label;
  return inferPlatformLabel(tool);
}

function inferPlatformLabel(tool = {}) {
  const repositoryUrl = String(tool.repositoryUrl || "").trim();
  try {
    const url = new URL(repositoryUrl);
    const owner = url.pathname.split("/").filter(Boolean)[0] || "";
    if (owner.toLowerCase() === "hajime-tokyo-1213") return "01mur";
    if (owner.toLowerCase() === "07-hajime-tokyo") return "07haj";
  } catch {
    // Ignore invalid optional URLs and fall back to the title rule.
  }
  const title = String(tool.title || "");
  if (title.includes("チームワークスペース") || title.includes("チームワーク")) return "01mur";
  return "07haj";
}

function compareSheetOrder(a, b) {
  const orderA = getDisplayOrder(a);
  const orderB = getDisplayOrder(b);
  if (orderA !== orderB) return orderA - orderB;
  return a.title.localeCompare(b.title, "ja");
}

function compareCardOrder(a, b) {
  const orderA = getCardOrder(a);
  const orderB = getCardOrder(b);
  const hasOrderA = Number.isFinite(orderA);
  const hasOrderB = Number.isFinite(orderB);
  if (hasOrderA && hasOrderB && orderA !== orderB) return orderA - orderB;
  if (hasOrderA && !hasOrderB) return -1;
  if (!hasOrderA && hasOrderB) return 1;
  return 0;
}

function getDisplayOrder(tool) {
  const order = Number(tool.displayOrder);
  return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
}

function getCardOrder(tool) {
  const order = Number(tool.cardOrder);
  return Number.isFinite(order) ? order : Number.NaN;
}

function isSheetGroupOpen(category) {
  return state.openSheetGroups.has(category);
}

function createTableRow(tool) {
  return `
    <tr data-id="${tool.id}">
      <td>
        <span class="table-title">${escapeHtml(tool.title)}</span>
        <span class="table-url">${escapeHtml(tool.url)}</span>
      </td>
      <td>${escapeHtml(tool.category)}</td>
      <td>${typeLabels[tool.type] || tool.type}</td>
      <td>${statusLabels[tool.status] || tool.status}</td>
      <td class="last-opened-cell">${tool.lastOpenedAt ? formatDate(tool.lastOpenedAt) : "未オープン"}</td>
      <td>
        <div class="row-actions">
          <button class="icon-only ${tool.pinned ? "is-pinned" : ""}" type="button" data-action="pin" aria-label="${tool.pinned ? "固定を外す" : "固定する"}">
            <i data-lucide="pin" aria-hidden="true"></i>
          </button>
          <button class="icon-only" type="button" data-action="copy" aria-label="URLをコピー">
            <i data-lucide="copy" aria-hidden="true"></i>
          </button>
          <button class="icon-only" type="button" data-action="edit" aria-label="編集">
            <i data-lucide="pencil" aria-hidden="true"></i>
          </button>
          <a class="icon-only" href="${escapeAttribute(tool.url)}" target="_blank" rel="noreferrer" data-action="open" aria-label="開く">
            <i data-lucide="external-link" aria-hidden="true"></i>
          </a>
        </div>
      </td>
    </tr>
  `;
}

function bindCardActions(root) {
  root.querySelectorAll("[data-action]").forEach((target) => {
    target.addEventListener("click", (event) => {
      const action = target.dataset.action;
      const itemRoot = target.closest("[data-id]");
      const toolId = itemRoot?.dataset.id || target.dataset.id;
      const tool = getTools().find((entry) => entry.id === toolId);
      if (!tool) return;

      if (action === "open") {
        trackOpen(tool.id);
        return;
      }

      event.preventDefault();
      if (action === "pin") togglePin(tool.id);
      if (action === "copy") copyUrl(tool);
      if (action === "edit") openDialog(tool);
      if (action === "edit-category") openDialog(tool, "category");
    });
  });
}

function bindCardDrag(root) {
  const handles = root.querySelectorAll(".card-drag-handle");
  const cards = root.querySelectorAll("[data-card-key]");

  handles.forEach((handle) => {
    handle.addEventListener("dragstart", (event) => {
      const card = handle.closest("[data-card-key]");
      const container = card?.closest(".tool-grid-section, .tool-grid");
      if (!card || !container) return;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", card.dataset.cardKey || "");
      state.draggingCard = {
        key: card.dataset.cardKey || "",
        kind: card.dataset.cardKind || "tool",
        type: card.dataset.cardType || "",
        category: card.dataset.cardCategory || "",
        containerKey: getCardContainerKey(container),
      };
      card.classList.add("is-card-dragging");
    });

    handle.addEventListener("dragend", () => {
      cleanupCardDrag(root);
      state.draggingCard = null;
    });
  });

  cards.forEach((card) => {
    card.addEventListener("dragover", (event) => {
      const container = card.closest(".tool-grid-section, .tool-grid");
      if (!state.draggingCard || !container) return;
      if (state.draggingCard.containerKey !== getCardContainerKey(container)) return;
      if (state.draggingCard.key === card.dataset.cardKey) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const insertAfter = shouldInsertCardAfter(card, event);
      card.classList.add("is-card-drop-target");
      card.classList.toggle("is-card-drop-after", insertAfter);
    });

    card.addEventListener("dragleave", () => {
      card.classList.remove("is-card-drop-target", "is-card-drop-after");
    });

    card.addEventListener("drop", (event) => {
      const container = card.closest(".tool-grid-section, .tool-grid");
      if (!state.draggingCard || !container) return;
      if (state.draggingCard.containerKey !== getCardContainerKey(container)) return;
      const sourceKey = state.draggingCard.key || event.dataTransfer.getData("text/plain");
      const targetKey = card.dataset.cardKey || "";
      if (!sourceKey || !targetKey || sourceKey === targetKey) return;
      event.preventDefault();
      const insertAfter = shouldInsertCardAfter(card, event);
      card.classList.remove("is-card-drop-target", "is-card-drop-after");
      reorderCards(sourceKey, targetKey, insertAfter);
    });
  });
}

function cleanupCardDrag(root) {
  root.querySelectorAll("[data-card-key]").forEach((card) => {
    card.classList.remove("is-card-dragging", "is-card-drop-target", "is-card-drop-after");
  });
}

function getCardContainerKey(container) {
  const section = container.closest("[data-type-section]");
  if (section?.dataset.typeSection) return `section:${section.dataset.typeSection}`;
  return `root:${state.type}:${state.category}:${state.query}`;
}

function shouldInsertCardAfter(card, event) {
  const bounds = card.getBoundingClientRect();
  const midY = bounds.top + bounds.height / 2;
  const midX = bounds.left + bounds.width / 2;
  return event.clientY > midY || (event.clientY >= bounds.top && event.clientY <= bounds.bottom && event.clientX > midX);
}

function bindSheetDrag(root) {
  const handles = root.querySelectorAll(".sheet-drag-handle");
  const rows = root.querySelectorAll(".sheet-group-row");

  handles.forEach((handle) => {
    handle.addEventListener("dragstart", (event) => {
      const row = handle.closest(".sheet-group-row");
      if (!row) return;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", row.dataset.id || "");
      state.draggingSheet = {
        id: row.dataset.id || "",
        category: row.dataset.category || "",
      };
      row.classList.add("is-dragging");
    });

    handle.addEventListener("dragend", () => {
      root.querySelectorAll(".sheet-group-row").forEach((row) => {
        row.classList.remove("is-dragging", "is-drop-target", "is-drop-after");
      });
      state.draggingSheet = null;
    });
  });

  rows.forEach((row) => {
    row.addEventListener("dragover", (event) => {
      const sourceCategory = state.draggingSheet?.category || "";
      if (sourceCategory && sourceCategory !== row.dataset.category) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const bounds = row.getBoundingClientRect();
      const insertAfter = event.clientY > bounds.top + bounds.height / 2;
      row.classList.add("is-drop-target");
      row.classList.toggle("is-drop-after", insertAfter);
    });

    row.addEventListener("dragleave", () => {
      row.classList.remove("is-drop-target", "is-drop-after");
    });

    row.addEventListener("drop", (event) => {
      const sourceId = state.draggingSheet?.id || event.dataTransfer.getData("text/plain");
      const sourceCategory = state.draggingSheet?.category || "";
      const targetId = row.dataset.id || "";
      const targetCategory = row.dataset.category || "";
      const bounds = row.getBoundingClientRect();
      const insertAfter = event.clientY > bounds.top + bounds.height / 2;
      row.classList.remove("is-drop-target", "is-drop-after");
      if (!sourceId || !targetId || sourceId === targetId || sourceCategory !== targetCategory) return;
      event.preventDefault();
      reorderSheets(sourceId, targetId, targetCategory, insertAfter);
    });
  });
}

function bindSheetGroupToggles(root) {
  root.querySelectorAll(".sheet-group-toggle").forEach((details) => {
    details.addEventListener("toggle", () => {
      const category = details.dataset.sheetGroup;
      if (!category) return;
      if (details.open) {
        state.openSheetGroups.add(category);
      } else {
        state.openSheetGroups.delete(category);
      }
    });
  });
}

function getFilteredTools() {
  return getTools()
    .filter((tool) => state.category === "all" || tool.category === state.category)
    .filter((tool) => state.type === "all" || tool.type === state.type)
    .filter((tool) => {
      if (!state.query) return true;
      const haystack = [
        tool.title,
        tool.category,
        typeLabels[tool.type],
        statusLabels[tool.status],
        tool.description,
        tool.platformLabel,
        tool.repositoryUrl,
        tool.vercelUrl,
        tool.tidbUrl,
        tool.notionUrl,
        tool.url,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(state.query);
    })
    .sort((a, b) => {
      if (state.sort !== "manual" && a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (state.sort === "manual") {
        return compareCardOrder(a, b);
      }
      if (state.sort === "recent") {
        return getTime(b.lastOpenedAt) - getTime(a.lastOpenedAt);
      }
      if (state.sort === "category") {
        return `${a.category}${a.title}`.localeCompare(`${b.category}${b.title}`, "ja");
      }
      return a.title.localeCompare(b.title, "ja");
    });
}

function openDialog(tool = null, focusField = "title") {
  state.editingId = tool?.id || null;
  el.dialogTitle.textContent = tool ? "編集" : "登録";
  el.deleteButton.hidden = !tool || isSharedMode();

  formFields.id.value = tool?.id || "";
  formFields.title.value = tool?.title || "";
  formFields.url.value = tool?.url || "";
  formFields.platformLabel.value = normalizePlatformLabel(tool?.platformLabel, tool || {});
  formFields.repositoryUrl.value = tool?.repositoryUrl || "";
  formFields.vercelUrl.value = tool?.vercelUrl || (tool && isVercelUrl(tool.url) ? tool.url : "");
  formFields.tidbUrl.value = tool?.tidbUrl || "";
  formFields.notionUrl.value = tool?.notionUrl || "";
  formFields.category.value = tool?.category || "";
  formFields.type.value = tool?.type || "site";
  formFields.status.value = tool?.status || "active";
  formFields.description.value = tool?.description || "";
  applyDefaultCategoryForType();

  el.toolDialog.showModal();
  (formFields[focusField] || formFields.title).focus();
  renderIcons();
}

function applyDefaultCategoryForType() {
  const category = formFields.category.value.trim();
  if (formFields.type.value === "sheet" && (!category || category === "未分類" || category === "その他")) {
    formFields.category.value = "税理士";
  }
}

function closeDialog() {
  el.toolDialog.close();
  el.toolForm.reset();
  state.editingId = null;
}

function saveFromForm() {
  const existingTool = state.editingId
    ? getBaseTools().find((tool) => tool.id === state.editingId)
    : null;
  if (isSharedMode()) {
    if (state.editingId) {
      updateSharedToolFromForm();
      return;
    }
    createSharedToolFromForm();
    return;
  }
  const now = new Date().toISOString();
  const toolType = formFields.type.value;
  const payload = {
    id: state.editingId || createId(formFields.title.value),
    title: formFields.title.value.trim(),
    url: formFields.url.value.trim(),
    platformLabel: formFields.platformLabel.value,
    repositoryUrl: formFields.repositoryUrl.value.trim(),
    vercelUrl: formFields.vercelUrl.value.trim(),
    tidbUrl: formFields.tidbUrl.value.trim(),
    notionUrl: formFields.notionUrl.value.trim(),
    category: normalizeCategory(formFields.category.value, toolType),
    type: toolType,
    status: formFields.status.value,
    description: formFields.description.value.trim(),
    displayOrder: existingTool?.displayOrder,
    cardOrder: existingTool?.cardOrder,
    tags: state.editingId
      ? getTools().find((tool) => tool.id === state.editingId)?.tags || []
      : [],
    pinned: false,
    createdAt: now,
    lastOpenedAt: "",
    openCount: 0,
  };

  if (state.editingId) {
    setTools(getTools().map((tool) =>
      tool.id === state.editingId
        ? {
            ...tool,
            ...payload,
            pinned: tool.pinned,
            createdAt: tool.createdAt,
            lastOpenedAt: tool.lastOpenedAt,
            openCount: tool.openCount,
          }
        : tool,
    ));
  } else {
    setTools([payload, ...getTools()]);
  }

  persist();
  closeDialog();
  render();
  showToast("保存しました");
}

async function updateSharedToolFromForm() {
  const existingTool = getBaseTools().find((tool) => tool.id === state.editingId);
  const toolType = formFields.type.value;
  const payload = {
    id: state.editingId,
    title: formFields.title.value.trim(),
    url: formFields.url.value.trim(),
    platformLabel: formFields.platformLabel.value,
    repositoryUrl: formFields.repositoryUrl.value.trim(),
    vercelUrl: formFields.vercelUrl.value.trim(),
    tidbUrl: formFields.tidbUrl.value.trim(),
    notionUrl: formFields.notionUrl.value.trim(),
    category: normalizeCategory(formFields.category.value, toolType),
    type: toolType,
    status: formFields.status.value,
    description: formFields.description.value.trim(),
    displayOrder: existingTool?.displayOrder,
    cardOrder: existingTool?.cardOrder,
  };

  try {
    const response = await fetch("/api/shared-tools", {
      cache: "no-store",
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Notion DBを更新できませんでした");
    }
    if (!result.tool) {
      throw new Error(result.message || "Notion DBを更新できませんでした");
    }
    state.sharedTools = state.sharedTools.map((tool) =>
      tool.id === result.tool.id ? result.tool : tool,
    );
    state.sharedLoaded = true;
    state.sharedError = "";
    closeDialog();
    render();
    showToast("Notion DBを更新しました");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Notion DBを更新できませんでした");
  }
}

async function createSharedToolFromForm() {
  const toolType = formFields.type.value;
  const payload = {
    title: formFields.title.value.trim(),
    url: formFields.url.value.trim(),
    platformLabel: formFields.platformLabel.value,
    repositoryUrl: formFields.repositoryUrl.value.trim(),
    vercelUrl: formFields.vercelUrl.value.trim(),
    tidbUrl: formFields.tidbUrl.value.trim(),
    notionUrl: formFields.notionUrl.value.trim(),
    category: normalizeCategory(formFields.category.value, toolType),
    type: toolType,
    status: formFields.status.value,
    description: formFields.description.value.trim(),
    cardOrder: null,
    pinned: false,
  };

  try {
    const response = await fetch("/api/shared-tools", {
      cache: "no-store",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Notion DBに保存できませんでした");
    }
    if (!result.tool) {
      throw new Error(result.message || "Notion DBに保存できませんでした");
    }
    state.sharedTools = [result.tool, ...state.sharedTools.filter((tool) => tool.id !== result.tool.id)];
    state.sharedLoaded = true;
    state.sharedError = "";
    closeDialog();
    render();
    showToast("Notion DBに保存しました");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Notion DBに保存できませんでした");
  }
}

function reorderCards(sourceKey, targetKey, insertAfter = false) {
  const dragging = state.draggingCard;
  if (!dragging) return;
  const changedTools =
    dragging.kind === "sheet-group"
      ? reorderSheetGroupCards(sourceKey.replace(/^sheet:/, ""), targetKey.replace(/^sheet:/, ""), insertAfter)
      : reorderToolCards(sourceKey, targetKey, dragging.type, insertAfter);

  if (!changedTools.length) return;
  state.sort = "manual";
  el.sortSelect.value = "manual";
  persistCardOrder(changedTools);
  render();
}

function reorderToolCards(sourceId, targetId, type, insertAfter = false) {
  const tools = getBaseTools();
  const visibleItems = getFilteredTools().filter((tool) => tool.type === type);
  const orderedItems = reorderItemList(visibleItems, sourceId, targetId, insertAfter, (tool) => tool.id);
  if (!orderedItems.length) return [];

  const updatedItems = orderedItems.map((tool, index) => ({
    ...tool,
    cardOrder: (index + 1) * 10,
  }));
  const orderedMap = new Map(updatedItems.map((tool) => [tool.id, tool]));
  setTools(tools.map((tool) => orderedMap.get(tool.id) || tool));
  return updatedItems;
}

function reorderSheetGroupCards(sourceCategory, targetCategory, insertAfter = false) {
  const tools = getBaseTools();
  const visibleSheets = getFilteredTools().filter((tool) => tool.type === "sheet");
  const groups = groupByCategory(visibleSheets);
  const orderedGroups = reorderItemList(groups, sourceCategory, targetCategory, insertAfter, ([category]) => category);
  if (!orderedGroups.length) return [];

  const groupOrders = new Map(
    orderedGroups.map(([category], index) => [category, (index + 1) * 10]),
  );
  const updatedItems = tools
    .filter((tool) => tool.type === "sheet" && groupOrders.has(tool.category))
    .map((tool) => ({
      ...tool,
      cardOrder: groupOrders.get(tool.category),
    }));
  const orderedMap = new Map(updatedItems.map((tool) => [tool.id, tool]));
  setTools(tools.map((tool) => orderedMap.get(tool.id) || tool));
  return updatedItems;
}

function reorderItemList(items, sourceKey, targetKey, insertAfter, getKey) {
  const nextItems = [...items];
  const fromIndex = nextItems.findIndex((item) => getKey(item) === sourceKey);
  let toIndex = nextItems.findIndex((item) => getKey(item) === targetKey);
  if (fromIndex < 0 || toIndex < 0) return [];
  const [moved] = nextItems.splice(fromIndex, 1);
  if (fromIndex < toIndex) toIndex -= 1;
  if (insertAfter) toIndex += 1;
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
}

function persistCardOrder(tools) {
  if (isSharedMode()) {
    persistSharedToolOrder(tools);
    return;
  }
  persist();
  showToast("順番を保存しました");
}

function reorderSheets(sourceId, targetId, category, insertAfter = false) {
  state.openSheetGroups.add(category);
  const tools = getBaseTools();
  const sheetItems = tools
    .filter((tool) => tool.type === "sheet" && tool.category === category)
    .sort(compareSheetOrder);
  const fromIndex = sheetItems.findIndex((tool) => tool.id === sourceId);
  let toIndex = sheetItems.findIndex((tool) => tool.id === targetId);
  if (fromIndex < 0 || toIndex < 0) return;

  const [moved] = sheetItems.splice(fromIndex, 1);
  if (fromIndex < toIndex) toIndex -= 1;
  if (insertAfter) toIndex += 1;
  sheetItems.splice(toIndex, 0, moved);
  const orderedItems = sheetItems.map((tool, index) => ({
    ...tool,
    displayOrder: (index + 1) * 10,
  }));
  const orderedMap = new Map(orderedItems.map((tool) => [tool.id, tool]));

  setTools(tools.map((tool) => orderedMap.get(tool.id) || tool));
  if (isSharedMode()) {
    persistSharedToolOrder(orderedItems);
  } else {
    persist();
    showToast("順番を保存しました");
  }
  render();
}

async function persistSharedToolOrder(tools) {
  try {
    await Promise.all(tools.map((tool) => updateSharedToolOrder(tool)));
    showToast("順番を保存しました");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "順番を保存できませんでした");
  }
}

async function updateSharedToolOrder(tool) {
  const response = await fetch("/api/shared-tools", {
    cache: "no-store",
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      id: tool.id,
      title: tool.title,
      url: tool.url,
      platformLabel: tool.platformLabel,
      repositoryUrl: tool.repositoryUrl,
      vercelUrl: tool.vercelUrl,
      tidbUrl: tool.tidbUrl,
      notionUrl: tool.notionUrl,
      category: tool.category,
      type: tool.type,
      status: tool.status,
      description: tool.description,
      displayOrder: tool.displayOrder,
      cardOrder: tool.cardOrder,
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.tool) {
    throw new Error(result.error || result.message || "順番を保存できませんでした");
  }
}

function togglePin(id) {
  if (isSharedMode()) {
    const tool = getTools().find((entry) => entry.id === id);
    if (!tool) return;
    const nextPinned = !tool.pinned;
    state.pinOverrides[id] = nextPinned;
    localStorage.setItem(PIN_OVERRIDES_KEY, JSON.stringify(state.pinOverrides));
    render();
    showToast(nextPinned ? "ピン留めしました" : "ピン留めを外しました");
    return;
  }
  setTools(getTools().map((tool) =>
    tool.id === id ? { ...tool, pinned: !tool.pinned } : tool,
  ));
  persist();
  render();
}

async function copyUrl(tool) {
  try {
    await navigator.clipboard.writeText(tool.url);
    showToast("URLをコピーしました");
  } catch {
    showToast(tool.url);
  }
}

function trackOpen(id) {
  const now = new Date().toISOString();
  setTools(getTools().map((tool) =>
    tool.id === id
      ? { ...tool, lastOpenedAt: now, openCount: Number(tool.openCount || 0) + 1 }
      : tool,
  ));
  state.recent = [id, ...state.recent.filter((recentId) => recentId !== id)].slice(0, 8);
  persist();
}

function exportData() {
  if (isSharedMode()) {
    showToast("共有データはNotion側で管理されています");
    return;
  }
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    tools: state.personalTools,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `manus-portal-${formatFileDate(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("JSONを保存しました");
}

function importData(event) {
  if (isSharedMode()) {
    showToast("共有データはNotion側で管理されています");
    event.target.value = "";
    return;
  }
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const importedTools = Array.isArray(parsed) ? parsed : parsed.tools;
      if (!Array.isArray(importedTools)) throw new Error("Invalid format");
      state.personalTools = importedTools.map((tool) => {
        const type = tool.type || "site";
        return {
          id: tool.id || createId(tool.title || tool.url || "entry"),
          title: String(tool.title || "無題"),
          url: String(tool.url || ""),
          category: normalizeCategory(tool.category, type),
          type,
          status: tool.status || "active",
          description: String(tool.description || ""),
          platformLabel: normalizePlatformLabel(tool.platformLabel || tool.displayName, tool),
          repositoryUrl: String(tool.repositoryUrl || tool.repoUrl || ""),
          vercelUrl: String(tool.vercelUrl || ""),
          tidbUrl: String(tool.tidbUrl || tool.tidbCloudUrl || ""),
          notionUrl: String(tool.notionUrl || tool.notionPageUrl || ""),
          displayOrder: normalizeDisplayOrder(tool.displayOrder),
          cardOrder: normalizeCardOrder(tool.cardOrder),
          tags: Array.isArray(tool.tags) ? tool.tags.map(String) : parseTags(tool.tags || ""),
          pinned: Boolean(tool.pinned),
          createdAt: tool.createdAt || new Date().toISOString(),
          lastOpenedAt: tool.lastOpenedAt || "",
          openCount: Number(tool.openCount || 0),
        };
      });
      state.category = "all";
      state.type = "all";
      persist();
      render();
      showToast("JSONを取り込みました");
    } catch {
      showToast("取り込めないJSONです");
    } finally {
      event.target.value = "";
    }
  });
  reader.readAsText(file);
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.personalTools));
  localStorage.setItem(RECENT_KEY, JSON.stringify(state.recent));
}

function loadTools() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadRecent() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadPinOverrides() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PIN_OVERRIDES_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function loadSource() {
  return "shared";
}

async function loadSharedTools() {
  state.sharedLoading = true;
  state.sharedError = "";
  render();

  try {
    const response = await fetch("/api/shared-tools", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Notion共有データを読み込めませんでした");
    }
    state.sharedTools = Array.isArray(payload.tools) ? payload.tools : [];
    state.sharedLoaded = true;
    state.sharedError = payload.configured
      ? ""
      : "Notion未設定です。個人データはそのまま使えます。";
  } catch (error) {
    state.sharedTools = [];
    state.sharedError =
      error instanceof Error ? error.message : "Notion共有データを読み込めませんでした";
  } finally {
    state.sharedLoading = false;
    render();
  }
}

function normalizeTools() {
  state.personalTools = normalizeToolList(state.personalTools);
  state.sharedTools = normalizeToolList(state.sharedTools);
}

function normalizeToolList(tools) {
  return tools.map((tool) => {
    const type = tool.type || "site";
    return {
      ...tool,
      category: normalizeCategory(tool.category, type),
      type,
      status: tool.status || "active",
      platformLabel: normalizePlatformLabel(tool.platformLabel || tool.displayName, tool),
      repositoryUrl: String(tool.repositoryUrl || tool.repoUrl || ""),
      vercelUrl: String(tool.vercelUrl || ""),
      tidbUrl: String(tool.tidbUrl || tool.tidbCloudUrl || ""),
      notionUrl: String(tool.notionUrl || tool.notionPageUrl || ""),
      displayOrder: normalizeDisplayOrder(tool.displayOrder),
      cardOrder: normalizeCardOrder(tool.cardOrder),
      tags: Array.isArray(tool.tags) ? tool.tags : parseTags(tool.tags || ""),
    };
  });
}

function normalizeCategory(value, type = "") {
  const fallback = type === "sheet" ? "税理士" : "未分類";
  const category = String(value || fallback).trim() || fallback;
  if (type === "sheet" && category === "未分類") return "税理士";
  if (["コミュニケーション", "市場調査", "取引管理", "申請・見積もり", "申請見積もり"].includes(category)) {
    return "共有";
  }
  if (category === "OEM・輸入") return "中国輸入";
  return category;
}

function normalizeDisplayOrder(value) {
  if (value === "" || value === null || value === undefined) return null;
  const order = Number(value);
  return Number.isFinite(order) ? order : null;
}

function normalizeCardOrder(value) {
  if (value === "" || value === null || value === undefined) return null;
  const order = Number(value);
  return Number.isFinite(order) ? order : null;
}

function getCategories() {
  return [...new Set(getTools().map((tool) => tool.category))].sort((a, b) =>
    a.localeCompare(b, "ja"),
  );
}

function getTags() {
  return [...new Set(getTools().flatMap((tool) => tool.tags || []))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ja"));
}

function groupByCategory(tools) {
  const groups = new Map();
  tools.forEach((tool) => {
    const category = tool.category || "未分類";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(tool);
  });
  return [...groups.entries()].sort(([categoryA, itemsA], [categoryB, itemsB]) => {
    const orderA = getGroupCardOrder(itemsA);
    const orderB = getGroupCardOrder(itemsB);
    const hasOrderA = Number.isFinite(orderA);
    const hasOrderB = Number.isFinite(orderB);
    if (hasOrderA && hasOrderB && orderA !== orderB) return orderA - orderB;
    if (hasOrderA && !hasOrderB) return -1;
    if (!hasOrderA && hasOrderB) return 1;
    return categoryA.localeCompare(categoryB, "ja");
  });
}

function getGroupCardOrder(items) {
  const orders = items
    .map((tool) => getCardOrder(tool))
    .filter((order) => Number.isFinite(order));
  return orders.length ? Math.min(...orders) : Number.NaN;
}

function getAccentClass(category, index = null) {
  const categories = getCategories();
  const resolvedIndex = index ?? Math.max(categories.indexOf(category), 0);
  return categoryAccents[resolvedIndex % categoryAccents.length];
}

function getTypeIcon(type) {
  const icons = {
    all: "layout-dashboard",
    site: "globe-2",
    sheet: "table-2",
    doc: "file-text",
    report: "bar-chart-3",
  };
  return icons[type] || "link";
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "未分類";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function dedupeById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function parseTags(value) {
  return String(value)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function createId(value) {
  const base = String(value)
    .trim()
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9ぁ-んァ-ン一-龥]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return `${base || "entry"}-${Date.now().toString(36)}`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未設定";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatFileDate(date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function getTime(value) {
  const time = new Date(value || 0).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function isVercelUrl(value) {
  try {
    return new URL(value).hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    el.toast.classList.remove("is-visible");
  }, 2200);
}

function renderIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
