const STORAGE_KEY = "manus-portal-tools-v1";
const RECENT_KEY = "manus-portal-recent-v1";
const PIN_OVERRIDES_KEY = "manus-portal-pin-overrides-v1";

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
  sort: "recent",
  editingId: null,
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
  sidebarTotal: document.querySelector("#sidebarTotal"),
  sidebarPinned: document.querySelector("#sidebarPinned"),
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
  repositoryUrl: document.querySelector("#toolRepositoryUrl"),
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
    } else if (value.includes("docs.google.com/document")) {
      formFields.type.value = "doc";
    }
  });
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
  el.sidebarTotal.textContent = tools.length;
  el.sidebarPinned.textContent = tools.filter((tool) => tool.pinned).length;
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
    .map(([category, items]) => {
      const accent = getAccentClass(category);
      const links = items
        .map((tool) => {
          const hostname = getHostname(tool.url);
          return `
            <div class="sheet-group-row" data-id="${tool.id}">
              <a class="sheet-group-item" href="${escapeAttribute(tool.url)}" target="_blank" rel="noreferrer" data-action="open">
                <span>
                  <strong>${escapeHtml(tool.title)}</strong>
                  <small>${escapeHtml(hostname)}</small>
                </span>
                <i data-lucide="external-link" aria-hidden="true"></i>
              </a>
              <button class="icon-only sheet-group-edit" type="button" data-action="edit" aria-label="編集">
                <i data-lucide="pencil" aria-hidden="true"></i>
              </button>
            </div>
          `;
        })
        .join("");

      return `
        <article class="tool-card sheet-group-card ${accent}" data-group="${escapeAttribute(category)}">
          <div class="sheet-group-head">
            <div class="sheet-group-title">
              <span class="card-icon" aria-hidden="true">
                <i data-lucide="folder" aria-hidden="true"></i>
              </span>
              <h4>${escapeHtml(category)}</h4>
            </div>
            <span class="pill">${items.length}件</span>
          </div>
          <details class="sheet-group-toggle">
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
  const hostname = getHostname(tool.url);
  const repositoryLink = createRepositoryLink(tool);
  return `
    <article class="tool-card ${compact ? "is-compact" : ""} ${accent}" data-id="${tool.id}">
      <div class="card-icon" aria-hidden="true">
        <i data-lucide="${getTypeIcon(tool.type)}" aria-hidden="true"></i>
      </div>
      <div class="card-info">
        <a class="card-text-link" href="${escapeAttribute(tool.url)}" target="_blank" rel="noreferrer" data-action="open">
          <h4>${escapeHtml(tool.title)}</h4>
          <p class="card-url">${escapeHtml(hostname)}</p>
          <p>${escapeHtml(tool.description || hostname)}</p>
        </a>
        ${repositoryLink}
      </div>
      <div class="card-actions">
        <button class="icon-only ${tool.pinned ? "is-pinned" : ""}" type="button" data-action="pin" aria-label="${tool.pinned ? "固定を外す" : "固定する"}">
          <i data-lucide="${tool.pinned ? "star" : "star"}" aria-hidden="true"></i>
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

function createRepositoryLink(tool) {
  if (!tool.repositoryUrl) return "";
  return `
    <a class="repo-link" href="${escapeAttribute(tool.repositoryUrl)}" target="_blank" rel="noreferrer" aria-label="リポジトリを開く">
      <i data-lucide="github" aria-hidden="true"></i>
      <span>${escapeHtml(getRepositoryLabel(tool.repositoryUrl))}</span>
    </a>
  `;
}

function getRepositoryLabel(value) {
  try {
    const url = new URL(value);
    if (url.hostname.includes("github.com")) {
      const parts = url.pathname.split("/").filter(Boolean).slice(0, 2);
      return parts.length === 2 ? parts.join("/") : "GitHub";
    }
    return getHostname(value);
  } catch {
    return "リポジトリ";
  }
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
            <i data-lucide="star" aria-hidden="true"></i>
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
        tool.repositoryUrl,
        tool.url,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(state.query);
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
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
  formFields.repositoryUrl.value = tool?.repositoryUrl || "";
  formFields.category.value = tool?.category || "";
  formFields.type.value = tool?.type || "site";
  formFields.status.value = tool?.status || "active";
  formFields.description.value = tool?.description || "";

  el.toolDialog.showModal();
  (formFields[focusField] || formFields.title).focus();
  renderIcons();
}

function closeDialog() {
  el.toolDialog.close();
  el.toolForm.reset();
  state.editingId = null;
}

function saveFromForm() {
  if (isSharedMode()) {
    if (state.editingId) {
      updateSharedToolFromForm();
      return;
    }
    createSharedToolFromForm();
    return;
  }
  const now = new Date().toISOString();
  const payload = {
    id: state.editingId || createId(formFields.title.value),
    title: formFields.title.value.trim(),
    url: formFields.url.value.trim(),
    repositoryUrl: formFields.repositoryUrl.value.trim(),
    category: normalizeCategory(formFields.category.value),
    type: formFields.type.value,
    status: formFields.status.value,
    description: formFields.description.value.trim(),
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
  const payload = {
    id: state.editingId,
    title: formFields.title.value.trim(),
    url: formFields.url.value.trim(),
    repositoryUrl: formFields.repositoryUrl.value.trim(),
    category: normalizeCategory(formFields.category.value),
    type: formFields.type.value,
    status: formFields.status.value,
    description: formFields.description.value.trim(),
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
  const payload = {
    title: formFields.title.value.trim(),
    url: formFields.url.value.trim(),
    repositoryUrl: formFields.repositoryUrl.value.trim(),
    category: normalizeCategory(formFields.category.value),
    type: formFields.type.value,
    status: formFields.status.value,
    description: formFields.description.value.trim(),
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
      state.personalTools = importedTools.map((tool) => ({
        id: tool.id || createId(tool.title || tool.url || "entry"),
        title: String(tool.title || "無題"),
        url: String(tool.url || ""),
        category: normalizeCategory(tool.category),
        type: tool.type || "site",
        status: tool.status || "active",
        description: String(tool.description || ""),
        repositoryUrl: String(tool.repositoryUrl || tool.repoUrl || ""),
        tags: Array.isArray(tool.tags) ? tool.tags.map(String) : parseTags(tool.tags || ""),
        pinned: Boolean(tool.pinned),
        createdAt: tool.createdAt || new Date().toISOString(),
        lastOpenedAt: tool.lastOpenedAt || "",
        openCount: Number(tool.openCount || 0),
      }));
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
  return tools.map((tool) => ({
    ...tool,
    category: normalizeCategory(tool.category),
    type: tool.type || "site",
    status: tool.status || "active",
    repositoryUrl: String(tool.repositoryUrl || tool.repoUrl || ""),
    tags: Array.isArray(tool.tags) ? tool.tags : parseTags(tool.tags || ""),
  }));
}

function normalizeCategory(value) {
  const category = String(value || "未分類").trim() || "未分類";
  if (["コミュニケーション", "市場調査", "取引管理", "申請・見積もり", "申請見積もり"].includes(category)) {
    return "共有";
  }
  if (category === "OEM・輸入") return "中国輸入";
  return category;
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
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "ja"));
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
