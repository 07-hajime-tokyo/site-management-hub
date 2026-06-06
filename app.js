const STORAGE_KEY = "manus-portal-tools-v1";
const RECENT_KEY = "manus-portal-recent-v1";
const PIN_OVERRIDES_KEY = "manus-portal-pin-overrides-v1";
const FX_CACHE_KEY = "manus-portal-fx-jpy-v2";
const ADD_CATEGORY_VALUE = "__add_category__";
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

const changeHistoryCardId = "review-change-history";
const communicationReportCardId = "communication-reports";
const ebayResearchDashboardCardId = "ebay-research-dashboard";
const ebaySourcingGuideCardId = "ebay-sourcing-guide";
const environmentSetupCardId = "environment-setup-guide";
const changeHistoryTool = {
  id: changeHistoryCardId,
  title: "【要確認】変更履歴",
  url: "./change-summary-slides.html",
  repositoryUrl: "",
  vercelUrl: "",
  tidbUrl: "",
  notionUrl: "https://github.com/07-hajime-tokyo/site-management-hub/issues/1",
  category: "共有",
  type: "site",
  status: "review",
  pinned: false,
  description: "業務ポータルに加えた変更内容をスタッフ確認用にまとめています。",
  tags: ["要確認", "変更履歴"],
  createdAt: "2026-06-06T03:54:00+09:00",
  lastOpenedAt: "",
  openCount: 0,
  cardOrder: -1000,
  isChangeHistoryCard: true,
};

const ebayResearchDashboardTool = {
  id: ebayResearchDashboardCardId,
  title: "eBayリサーチ判定",
  url: "./ebay-research.html",
  repositoryUrl: "",
  vercelUrl: "",
  tidbUrl: "",
  notionUrl: "",
  category: "共有",
  type: "site",
  status: "review",
  pinned: false,
  description: "還付込利益判定シートを、商品一覧と詳細プレビューで確認できる2ペイン画面です。",
  tags: ["eBay", "リサーチ", "利益判定", "出品可否", "SellerHacks"],
  createdAt: "2026-06-06T14:09:00+09:00",
  lastOpenedAt: "",
  openCount: 0,
  cardOrder: -875,
};

const ebaySourcingGuideTool = {
  id: ebaySourcingGuideCardId,
  title: "eBay仕入れ候補リサーチ手順",
  url: "./ebay-sourcing-guide.html",
  repositoryUrl: "",
  vercelUrl: "",
  tidbUrl: "",
  notionUrl: "",
  category: "共有",
  type: "site",
  status: "review",
  pinned: false,
  description:
    "入力シートとDrive配布済みURLオープナーを使って、ヤフオクのオークションURL中心に国内仕入れ候補を記録するスタッフ向け手順です。",
  tags: ["eBay", "リサーチ", "仕入れ候補", "URLオープナー", "スタッフ手順"],
  createdAt: "2026-06-07T04:20:00+09:00",
  lastOpenedAt: "",
  openCount: 0,
  cardOrder: -874,
};

const environmentSetupTool = {
  id: environmentSetupCardId,
  title: "環境構築ガイド",
  url: "./environment-setup.html",
  repositoryUrl: "",
  vercelUrl: "",
  tidbUrl: "",
  notionUrl: "",
  category: "共有",
  type: "site",
  status: "active",
  pinned: false,
  description: "他PCで同じ作業環境を使うために、Codexへ依頼する文面と確認項目をまとめています。",
  tags: ["環境構築", "GitHub", "Google Drive", "Codex"],
  createdAt: "2026-06-06T18:55:00+09:00",
  lastOpenedAt: "",
  openCount: 0,
  isEnvironmentSetupCard: true,
};

const communicationReportTool = {
  id: communicationReportCardId,
  title: "コミュニケーションレポート",
  url: "./reports/ebay-oregon-profit-20260606.html",
  repositoryUrl: "",
  vercelUrl: "",
  tidbUrl: "",
  notionUrl: "",
  category: "共有",
  type: "report",
  status: "review",
  pinned: false,
  description: "スタッフ共有用の説明レポートをまとめます。作成したレポートはこのカード内に追加します。",
  tags: ["レポート", "共有", "eBay", "利益計算", "コミュニケーション"],
  createdAt: "2026-06-06T11:58:00+09:00",
  lastOpenedAt: "",
  openCount: 0,
  cardOrder: -900,
  isCommunicationReportCard: true,
};

const changeHistoryItems = [
  {
    kind: "site",
    date: "2026-06-06 14:09",
    title: "eBayリサーチ判定ビューを追加",
    summary: "還付込利益判定シートを、左の商品一覧と右の詳細プレビューで見られるWebアプリにしました。",
    points: [
      "`ebay-research.html` を新設",
      "競合リンク、国内仕入確認リンク、Sold数、送料、HTS候補、関税、手数料、還付、利益率を1画面化",
      "good-select-jpの出品済み判定は、SellerHacks CSVまたは出品スナップショット投入で精密化する形にしました",
    ],
  },
  {
    kind: "rule",
    date: "2026-06-06 11:58",
    title: "eBay利益計算ルールをコミュニケーションレポートへ追加",
    summary: "Oregon倉庫、Ninja Express、関税、消費税還付候補、シャフト回収を含めた利益計算の共有ページを追加しました。",
    points: [
      "`reports/ebay-oregon-profit-20260606.html` を新設",
      "レポート欄に「コミュニケーションレポート」カードを追加",
      "サイト変更と実務ルール変更を色分けして確認できる形にしました",
    ],
  },
  {
    kind: "site",
    date: "2026-06-06 03:27",
    title: "eBay手順ページを業務ポータルに追加",
    summary: "旧手順サイトのVercel反映が止まっていたため、業務ポータル内に暫定の公開ページを追加しました。",
    points: [
      "`ebay-workflow.html` を新設",
      "サイドバーに「eBay手順」導線を追加",
      "収益判定、送料、関税、Ninja Express運用を1ページに整理",
    ],
  },
  {
    kind: "rule",
    date: "2026-06-06 03:19",
    title: "eBay収益判定とNinja運用の進捗データを追加",
    summary: "GitGraph風の進捗ダッシュボードに、今回のeBay自動化作業を追跡できるデータを追加しました。",
    points: [
      "`data/progress-seed.json` に機能・イベント・ソース・セッション要約を追加",
      "収益判定モデルとNinja Express運用整理を関連ソースとして登録",
      "公開APIで `ebay-profitability-workflow` が返ることを確認",
    ],
  },
  {
    kind: "site",
    date: "2026-06-06 03:42",
    title: "Notion共有ツールのリンク先を新ページへ変更",
    summary: "「ebayリサーチ出品ワークフロー」のURLを、旧サイトから業務ポータル内の新ページへ差し替えました。",
    points: [
      "旧URL: `research-workflow-source.vercel.app`",
      "新URL: `site-management-hub.vercel.app/ebay-workflow.html`",
      "スタッフさんの管理方針に合わなければ戻せます",
    ],
  },
  {
    kind: "site",
    date: "2026-06-06 03:54",
    title: "変更内容を説明する共有スライドを追加",
    summary: "スタッフさんが変更内容をすぐ確認できるよう、5枚構成の簡潔なWebスライドをPRで追加しています。",
    points: [
      "概要、変更点、理由、影響範囲、確認依頼を整理",
      "mainへ直接反映せず、PRでレビュー待ち",
      "Vercel preview はチーム設定により外部閲覧不可",
    ],
  },
];

const communicationReportItems = [
  {
    kind: "rule",
    date: "2026-06-06 11:58",
    title: "eBay利益計算ルールと今回の判定",
    href: "./reports/ebay-oregon-profit-20260606.html",
    summary:
      "eBay入金額、仕入れ、Oregon物流、Ninja Express、関税、消費税還付候補、Yahooシャフト回収をまとめて利益判定するルールです。",
    points: [
      "セールスレコード番号 `N` と入庫管理 `ebay_N` を結合",
      "ゴルフクラブのシャフトは原価二重計上せず、Yahoo回収益として加算",
      "今回の判定例とスタッフ確認ポイントを一覧化",
    ],
  },
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
  exchangeRate: document.querySelector("#exchangeRate"),
  exchangeRateDate: document.querySelector("#exchangeRateDate"),
  exchangeRateValue: document.querySelector("#exchangeRateValue"),
  refreshExchangeRateButton: document.querySelector("#refreshExchangeRateButton"),
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
  customCategoryField: document.querySelector("#customCategoryField"),
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
  customCategory: document.querySelector("#toolCustomCategory"),
  type: document.querySelector("#toolType"),
  status: document.querySelector("#toolStatus"),
  description: document.querySelector("#toolDescription"),
};

render();
bindEvents();
if (state.source === "shared") {
  loadSharedTools();
}
loadExchangeRate();

function getBaseTools() {
  return state.source === "shared" ? state.sharedTools : state.personalTools;
}

function getTools() {
  const baseTools = getBaseTools();
  const tools = isSharedMode()
    ? [
        changeHistoryTool,
        communicationReportTool,
        ebayResearchDashboardTool,
        ebaySourcingGuideTool,
        ...baseTools.filter(
          (tool) =>
            ![
              changeHistoryCardId,
              communicationReportCardId,
              ebayResearchDashboardCardId,
              ebaySourcingGuideCardId,
              environmentSetupCardId,
            ].includes(tool.id),
        ),
        environmentSetupTool,
      ]
    : baseTools;
  return tools.map(applyPinOverride);
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

  el.refreshExchangeRateButton?.addEventListener("click", () => loadExchangeRate({ force: true }));

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

  formFields.category.addEventListener("change", () => updateCustomCategoryField(true));
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
  const wasAddingCategory = formFields.category.value === ADD_CATEGORY_VALUE;
  const currentCategory = getCategoryFromForm();
  const categories = getCategories();
  if (currentCategory && !categories.includes(currentCategory)) {
    categories.push(currentCategory);
    categories.sort((a, b) => a.localeCompare(b, "ja"));
  }

  formFields.category.innerHTML = [
    `<option value="">カテゴリを選択</option>`,
    ...categories.map((category) => `<option value="${escapeAttribute(category)}">${escapeHtml(category)}</option>`),
    `<option value="${ADD_CATEGORY_VALUE}">カテゴリを追加</option>`,
  ].join("");

  if (wasAddingCategory) {
    formFields.category.value = ADD_CATEGORY_VALUE;
    formFields.customCategory.value = currentCategory;
  } else {
    formFields.category.value = currentCategory;
    formFields.customCategory.value = "";
  }
  updateCustomCategoryField(false);
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
  if (tool.isChangeHistoryCard) return createChangeHistoryCard(tool);
  if (tool.isCommunicationReportCard) return createCommunicationReportCard(tool);
  if (tool.isEnvironmentSetupCard) return createEnvironmentSetupCard(tool, compact);
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

function createEnvironmentSetupCard(tool, compact = false) {
  return `
    <article class="tool-card environment-setup-card accent-teal ${compact ? "is-compact" : ""}" data-id="${tool.id}" data-card-type="${escapeAttribute(tool.type)}">
      <span class="card-icon" aria-hidden="true">
        <i data-lucide="monitor-cog" aria-hidden="true"></i>
      </span>
      <div class="environment-card-main">
        <a class="card-text-link" href="${escapeAttribute(tool.url)}" target="_blank" rel="noreferrer" data-action="open">
          <h4>${escapeHtml(tool.title)}</h4>
        </a>
        <p>${escapeHtml(tool.description)}</p>
        <div class="environment-card-tags" aria-label="対象サービス">
          <span>GitHub</span>
          <span>Drive</span>
          <span>Chrome</span>
          <span>Notion</span>
        </div>
      </div>
      <a class="icon-only environment-card-open" href="${escapeAttribute(tool.url)}" target="_blank" rel="noreferrer" data-action="open" aria-label="開く">
        <i data-lucide="arrow-right" aria-hidden="true"></i>
      </a>
    </article>
  `;
}

function createCommunicationReportCard(tool) {
  const ruleCount = communicationReportItems.filter((item) => item.kind === "rule").length;
  const siteCount = communicationReportItems.filter((item) => item.kind === "site").length;
  const items = communicationReportItems
    .map((item) => `
      <details class="report-card-toggle report-kind-${escapeAttribute(item.kind)}">
        <summary>
          <span class="report-card-row-meta">
            <span class="report-kind-badge report-kind-${escapeAttribute(item.kind)}">${escapeHtml(getReportKindLabel(item.kind))}</span>
            <span class="report-card-date">${escapeHtml(item.date)}</span>
          </span>
          <strong>${escapeHtml(item.title)}</strong>
          <i data-lucide="chevron-down" aria-hidden="true"></i>
        </summary>
        <div class="report-card-detail">
          <p>${escapeHtml(item.summary)}</p>
          <ul>
            ${item.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
          </ul>
          <a class="report-card-link" href="${escapeAttribute(item.href)}" target="_blank" rel="noreferrer">
            レポートを開く
            <i data-lucide="external-link" aria-hidden="true"></i>
          </a>
        </div>
      </details>
    `)
    .join("");

  return `
    <article class="tool-card report-hub-card accent-amber" data-id="${tool.id}" data-card-type="${escapeAttribute(tool.type)}">
      <details class="report-card-shell">
        <summary class="report-card-main">
          <span class="card-icon" aria-hidden="true">
            <i data-lucide="message-square-text" aria-hidden="true"></i>
          </span>
          <span class="report-card-main-text">
            <h4>${escapeHtml(tool.title)}</h4>
            <span class="report-card-summary-line">
              <span class="platform-label">共有</span>
              <span class="report-kind-badge report-kind-site">サイト ${siteCount}</span>
              <span class="report-kind-badge report-kind-rule">実務 ${ruleCount}</span>
            </span>
          </span>
          <i data-lucide="chevron-down" aria-hidden="true"></i>
        </summary>
        <div class="report-card-body">
          <p class="report-card-lead">${escapeHtml(tool.description)}</p>
          <div class="report-card-list">
            ${items}
          </div>
        </div>
      </details>
    </article>
  `;
}

function createChangeHistoryCard(tool) {
  const siteCount = changeHistoryItems.filter((item) => item.kind === "site").length;
  const ruleCount = changeHistoryItems.filter((item) => item.kind === "rule").length;
  const items = changeHistoryItems
    .map((item) => `
      <details class="change-card-toggle change-kind-${escapeAttribute(item.kind)}">
        <summary>
          <span class="change-card-row-meta">
            <span class="change-kind-badge change-kind-${escapeAttribute(item.kind)}">${escapeHtml(getChangeKindLabel(item.kind))}</span>
            <span class="change-card-date">${escapeHtml(item.date)}</span>
          </span>
          <strong>${escapeHtml(item.title)}</strong>
          <i data-lucide="chevron-down" aria-hidden="true"></i>
        </summary>
        <div class="change-card-detail">
          <p>${escapeHtml(item.summary)}</p>
          <ul>
            ${item.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
          </ul>
        </div>
      </details>
    `)
    .join("");

  return `
    <article class="tool-card change-history-card accent-rose" data-id="${tool.id}" data-card-type="${escapeAttribute(tool.type)}">
      <details class="change-card-shell">
        <summary class="change-card-main">
          <span class="card-icon" aria-hidden="true">
            <i data-lucide="presentation" aria-hidden="true"></i>
          </span>
          <span class="change-card-main-text">
            <h4>${escapeHtml(tool.title)}</h4>
            <span class="change-card-summary-line">
              <span class="platform-label">要確認</span>
              <span class="change-kind-badge change-kind-site">サイト変更 ${siteCount}</span>
              <span class="change-kind-badge change-kind-rule">実務ルール ${ruleCount}</span>
            </span>
          </span>
          <i data-lucide="chevron-down" aria-hidden="true"></i>
        </summary>
        <div class="change-card-body">
          <p class="change-card-lead">${escapeHtml(tool.description)}</p>
          <div class="change-card-list">
            ${items}
          </div>
          <div class="change-card-links">
            <a class="change-card-slide-link" href="${escapeAttribute(tool.url)}" target="_blank" rel="noreferrer">
              変更共有スライドを見る
              <i data-lucide="external-link" aria-hidden="true"></i>
            </a>
            <a class="change-card-slide-link is-secondary" href="${escapeAttribute(tool.notionUrl)}" target="_blank" rel="noreferrer">
              共有Issue
              <i data-lucide="message-square" aria-hidden="true"></i>
            </a>
          </div>
        </div>
      </details>
    </article>
  `;
}

function getReportKindLabel(kind) {
  return kind === "site" ? "サイト共有" : "実務レポート";
}

function getChangeKindLabel(kind) {
  return kind === "rule" ? "実務ルール変更" : "サイト変更";
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
  formFields.type.value = tool?.type || "site";
  formFields.status.value = tool?.status || "active";
  formFields.description.value = tool?.description || "";
  renderCategoryOptions();
  setFormCategory(tool?.category || "");
  applyDefaultCategoryForType();

  el.toolDialog.showModal();
  (formFields[focusField] || formFields.title).focus();
  renderIcons();
}

function getCategoryFromForm() {
  if (formFields.category.value === ADD_CATEGORY_VALUE) {
    return formFields.customCategory.value.trim();
  }
  return formFields.category.value.trim();
}

function setFormCategory(category) {
  const value = String(category || "").trim();
  if (value && ![...formFields.category.options].some((option) => option.value === value)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    const addOption = [...formFields.category.options].find((optionItem) => optionItem.value === ADD_CATEGORY_VALUE);
    formFields.category.insertBefore(option, addOption || null);
  }
  formFields.category.value = value;
  formFields.customCategory.value = "";
  updateCustomCategoryField(false);
}

function updateCustomCategoryField(shouldFocus = false) {
  const addingCategory = formFields.category.value === ADD_CATEGORY_VALUE;
  el.customCategoryField.hidden = !addingCategory;
  formFields.customCategory.required = addingCategory;
  if (!addingCategory) {
    formFields.customCategory.value = "";
    return;
  }
  if (shouldFocus) {
    formFields.customCategory.focus();
  }
}

function applyDefaultCategoryForType() {
  const category = getCategoryFromForm();
  if (formFields.type.value === "sheet" && (!category || category === "未分類" || category === "その他")) {
    setFormCategory("税理士");
  }
}

function closeDialog() {
  el.toolDialog.close();
  el.toolForm.reset();
  updateCustomCategoryField(false);
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
  const category = getCategoryFromForm();
  const payload = {
    id: state.editingId || createId(formFields.title.value),
    title: formFields.title.value.trim(),
    url: formFields.url.value.trim(),
    platformLabel: formFields.platformLabel.value,
    repositoryUrl: formFields.repositoryUrl.value.trim(),
    vercelUrl: formFields.vercelUrl.value.trim(),
    tidbUrl: formFields.tidbUrl.value.trim(),
    notionUrl: formFields.notionUrl.value.trim(),
    category: normalizeCategory(category, toolType),
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
  const category = getCategoryFromForm();
  const payload = {
    id: state.editingId,
    title: formFields.title.value.trim(),
    url: formFields.url.value.trim(),
    platformLabel: formFields.platformLabel.value,
    repositoryUrl: formFields.repositoryUrl.value.trim(),
    vercelUrl: formFields.vercelUrl.value.trim(),
    tidbUrl: formFields.tidbUrl.value.trim(),
    notionUrl: formFields.notionUrl.value.trim(),
    category: normalizeCategory(category, toolType),
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
  const category = getCategoryFromForm();
  const payload = {
    title: formFields.title.value.trim(),
    url: formFields.url.value.trim(),
    platformLabel: formFields.platformLabel.value,
    repositoryUrl: formFields.repositoryUrl.value.trim(),
    vercelUrl: formFields.vercelUrl.value.trim(),
    tidbUrl: formFields.tidbUrl.value.trim(),
    notionUrl: formFields.notionUrl.value.trim(),
    category: normalizeCategory(category, toolType),
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

async function loadExchangeRate(options = {}) {
  const force = Boolean(options.force);
  const cached = readExchangeRateCache();
  if (cached && !force) {
    renderExchangeRate(cached, cached.dateKey !== getJapanDateKey());
  }

  setExchangeRateLoading(true);
  try {
    const [usdResponse, eurResponse] = await Promise.all([
      fetch("https://open.er-api.com/v6/latest/USD", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      }),
      fetch("https://open.er-api.com/v6/latest/EUR", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      }),
    ]);
    const [usdPayload, eurPayload] = await Promise.all([
      usdResponse.json(),
      eurResponse.json(),
    ]);
    const usdJpy = Number(usdPayload?.rates?.JPY);
    const eurJpy = Number(eurPayload?.rates?.JPY);
    if (
      !usdResponse.ok ||
      !eurResponse.ok ||
      !Number.isFinite(usdJpy) ||
      !Number.isFinite(eurJpy)
    ) {
      throw new Error("exchange rate unavailable");
    }
    const next = {
      usdJpy,
      eurJpy,
      dateKey: getJapanDateKey(),
      fetchedAt: new Date().toISOString(),
    };
    localStorage.setItem(FX_CACHE_KEY, JSON.stringify(next));
    renderExchangeRate(next, false);
    if (force) showToast("為替レートを更新しました");
  } catch {
    if (cached) {
      renderExchangeRate(cached, true);
    } else {
      renderExchangeRate(null, false);
    }
    if (force) showToast("為替レートを更新できませんでした");
  } finally {
    setExchangeRateLoading(false);
  }
}

function setExchangeRateLoading(loading) {
  if (!el.exchangeRate) return;
  el.exchangeRate.classList.toggle("is-loading", loading);
  if (el.refreshExchangeRateButton) {
    el.refreshExchangeRateButton.disabled = loading;
  }
}

function readExchangeRateCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(FX_CACHE_KEY) || "null");
    if (
      !cached ||
      !Number.isFinite(Number(cached.usdJpy)) ||
      !Number.isFinite(Number(cached.eurJpy))
    ) return null;
    return {
      ...cached,
      usdJpy: Number(cached.usdJpy),
      eurJpy: Number(cached.eurJpy),
      dateKey: cached.dateKey || "",
      fetchedAt: cached.fetchedAt || "",
    };
  } catch {
    return null;
  }
}

function renderExchangeRate(data, stale) {
  if (!el.exchangeRate || !el.exchangeRateValue) return;
  el.exchangeRate.classList.toggle("is-stale", Boolean(data && stale));
  el.exchangeRate.classList.toggle("is-error", !data);
  if (el.exchangeRateDate) {
    el.exchangeRateDate.textContent = `${formatJapanDateLabel()} 為替レート`;
  }
  if (!data) {
    el.exchangeRateValue.textContent = "USD --・EURO --";
    el.exchangeRate.title = "為替レートを取得できませんでした";
    return;
  }

  const usdValue = formatExchangeRate(data.usdJpy);
  const eurValue = formatExchangeRate(data.eurJpy);
  el.exchangeRateValue.innerHTML = `
    <span class="exchange-currency">USD <span class="exchange-amount">${usdValue}</span></span>
    <span class="exchange-separator">・</span>
    <span class="exchange-currency">EURO <span class="exchange-amount">${eurValue}</span></span>
  `;
  el.exchangeRate.title = `USD/JPY ${usdValue}・EUR/JPY ${eurValue}${stale ? "（前回取得）" : "（本日取得）"}`;
}

function formatExchangeRate(value) {
  return Number(value).toLocaleString("ja-JP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getJapanDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("ja-JP-u-ca-gregory", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatJapanDateLabel(date = new Date()) {
  const parts = new Intl.DateTimeFormat("ja-JP-u-ca-gregory", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}/${values.month}/${values.day}`;
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
