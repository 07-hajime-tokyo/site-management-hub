const state = {
  data: null,
  selectedFeatureId: "",
  query: "",
  area: "all",
  status: "all",
  eventType: "all",
};

const statusLabels = {
  active: "稼働中",
  building: "作成中",
  planned: "予定",
  done: "完了",
};

const statusIcons = {
  active: "check-circle-2",
  building: "hammer",
  planned: "circle-dashed",
  done: "badge-check",
};

const eventLabels = {
  commit: "コミット",
  decision: "判断",
  source: "情報源",
  process: "プロセス",
  memo: "メモ",
};

const areaColors = ["blue", "green", "teal", "amber", "rose", "violet"];

const el = {
  search: document.querySelector("#progressSearch"),
  areaFilter: document.querySelector("#areaFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  eventFilter: document.querySelector("#eventFilter"),
  refreshButton: document.querySelector("#refreshProgressButton"),
  sourceStack: document.querySelector("#sourceStack"),
  featureCount: document.querySelector("#featureCount"),
  commitCount: document.querySelector("#commitCount"),
  notionCount: document.querySelector("#notionCount"),
  latestUpdate: document.querySelector("#latestUpdate"),
  filteredFeatureCount: document.querySelector("#filteredFeatureCount"),
  filteredEventCount: document.querySelector("#filteredEventCount"),
  featureList: document.querySelector("#featureList"),
  graphLegend: document.querySelector("#graphLegend"),
  progressGraph: document.querySelector("#progressGraph"),
  featureDetail: document.querySelector("#featureDetail"),
  roadmapGrid: document.querySelector("#roadmapGrid"),
  sourceSummaryList: document.querySelector("#sourceSummaryList"),
  sessionSummaryList: document.querySelector("#sessionSummaryList"),
  memoForm: document.querySelector("#memoForm"),
  memoTitle: document.querySelector("#memoTitle"),
  memoFeature: document.querySelector("#memoFeature"),
  memoSourceUrl: document.querySelector("#memoSourceUrl"),
  memoNote: document.querySelector("#memoNote"),
  memoResult: document.querySelector("#memoResult"),
  toast: document.querySelector("#progressToast"),
};

bindEvents();
loadProgress({ notify: false });

function bindEvents() {
  el.search.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    render();
  });

  el.areaFilter.addEventListener("change", (event) => {
    state.area = event.target.value;
    ensureSelectedFeature();
    render();
  });

  el.statusFilter.addEventListener("change", (event) => {
    state.status = event.target.value;
    ensureSelectedFeature();
    render();
  });

  el.eventFilter.addEventListener("change", (event) => {
    state.eventType = event.target.value;
    render();
  });

  el.refreshButton.addEventListener("click", async () => {
    await rebuildProgress();
    await loadProgress({ notify: true });
  });

  el.memoForm.addEventListener("submit", submitMemo);
}

async function loadProgress(options = {}) {
  setLoading(true);
  try {
    const response = await fetch("/api/progress", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "進捗データを読み込めませんでした");
    state.data = data;
    if (!state.selectedFeatureId) {
      state.selectedFeatureId = data.features?.[0]?.id || "";
    }
    renderFilters();
    render();
    if (options.notify) showToast("進捗を更新しました");
  } catch (error) {
    renderError(error instanceof Error ? error.message : "進捗データを読み込めませんでした");
  } finally {
    setLoading(false);
  }
}

async function rebuildProgress() {
  try {
    const response = await fetch("/api/rebuild", {
      cache: "no-store",
      method: "POST",
      headers: { Accept: "application/json" },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "更新できませんでした");
  } catch (error) {
    showToast(error instanceof Error ? error.message : "更新できませんでした");
  }
}

function render() {
  if (!state.data) return;
  ensureSelectedFeature();
  renderSourceStack();
  renderMetrics();
  renderFeatureList();
  renderLegend();
  renderGraph();
  renderDetail();
  renderRoadmap();
  renderSourceSummaries();
  renderSessionSummaries();
  renderMemoOptions();
  renderIcons();
}

function renderFilters() {
  const data = state.data;
  const areas = [...new Set((data.features || []).map((feature) => feature.area).filter(Boolean))].sort();
  const statuses = [...new Set((data.features || []).map((feature) => feature.status).filter(Boolean))].sort();
  const eventTypes = [...new Set((data.events || []).map((event) => event.type).filter(Boolean))].sort();

  el.areaFilter.innerHTML = [
    `<option value="all">全領域</option>`,
    ...areas.map((area) => `<option value="${escapeAttribute(area)}">${escapeHtml(area)}</option>`),
  ].join("");
  el.statusFilter.innerHTML = [
    `<option value="all">全状態</option>`,
    ...statuses.map((status) => `<option value="${escapeAttribute(status)}">${escapeHtml(statusLabels[status] || status)}</option>`),
  ].join("");
  el.eventFilter.innerHTML = [
    `<option value="all">全イベント</option>`,
    ...eventTypes.map((type) => `<option value="${escapeAttribute(type)}">${escapeHtml(eventLabels[type] || type)}</option>`),
  ].join("");
}

function renderSourceStack() {
  const data = state.data;
  const sourceCards = [
    {
      id: "github",
      icon: "github",
      title: "GitHub",
      label: data.github?.repository?.fullName || data.repository?.fullName || "未設定",
      href: data.github?.repository?.url || data.repository?.url,
      ok: data.github?.configured,
    },
    {
      id: "vercel",
      icon: "triangle",
      title: "Vercel",
      label: "site-management-hub",
      href: data.vercel?.productionUrl,
      ok: true,
    },
    {
      id: "notion",
      icon: "database",
      title: "Notion",
      label: data.notion?.title || "サイト管理DB",
      href: data.notion?.url,
      ok: data.notion?.configured && !data.notion?.error,
    },
  ];

  el.sourceStack.innerHTML = sourceCards
    .map((source) => `
      <a class="source-status-card ${source.ok ? "is-ok" : "is-muted"}" href="${escapeAttribute(source.href || "#")}" target="_blank" rel="noreferrer">
        <span class="source-status-icon" aria-hidden="true">
          <i data-lucide="${source.icon}" aria-hidden="true"></i>
        </span>
        <span>
          <strong>${escapeHtml(source.title)}</strong>
          <small>${escapeHtml(source.label)}</small>
        </span>
        <i data-lucide="external-link" aria-hidden="true"></i>
      </a>
    `)
    .join("");
}

function renderMetrics() {
  const summaries = state.data.summaries || {};
  el.featureCount.textContent = summaries.featureCount || 0;
  el.commitCount.textContent = summaries.commitCount || 0;
  el.notionCount.textContent = summaries.notionRecordCount || 0;
  el.latestUpdate.textContent = formatShortDate(summaries.lastCommitAt || summaries.lastEventAt);
}

function renderFeatureList() {
  const features = getFilteredFeatures();
  el.filteredFeatureCount.textContent = features.length;
  el.featureList.innerHTML = features
    .map((feature) => `
      <button class="feature-item ${feature.id === state.selectedFeatureId ? "is-active" : ""}" type="button" data-feature-id="${escapeAttribute(feature.id)}">
        <span class="feature-accent ${getAreaClass(feature.area)}" aria-hidden="true"></span>
        <span class="feature-main">
          <strong>${escapeHtml(feature.title)}</strong>
          <small>${escapeHtml(feature.area)} / ${escapeHtml(statusLabels[feature.status] || feature.status)}</small>
        </span>
        <span class="feature-commit-count">${Number(feature.commitCount || 0)}</span>
      </button>
    `)
    .join("");

  el.featureList.querySelectorAll("[data-feature-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedFeatureId = button.dataset.featureId;
      render();
    });
  });
}

function renderLegend() {
  const features = getFilteredFeatures();
  el.graphLegend.innerHTML = features
    .slice(0, 6)
    .map((feature) => `
      <button class="legend-chip ${feature.id === state.selectedFeatureId ? "is-active" : ""}" type="button" data-feature-id="${escapeAttribute(feature.id)}">
        <span class="legend-dot ${getAreaClass(feature.area)}" aria-hidden="true"></span>
        ${escapeHtml(feature.title)}
      </button>
    `)
    .join("");

  el.graphLegend.querySelectorAll("[data-feature-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedFeatureId = button.dataset.featureId;
      render();
    });
  });
}

function renderGraph() {
  const events = getFilteredEvents();
  const features = getFilteredFeatures();
  const laneMap = new Map(features.map((feature, index) => [feature.id, index % 5]));
  el.filteredEventCount.textContent = events.length;

  if (!events.length) {
    el.progressGraph.innerHTML = `
      <div class="graph-empty">
        <i data-lucide="git-branch" aria-hidden="true"></i>
        <p>該当する履歴はありません</p>
      </div>
    `;
    return;
  }

  el.progressGraph.innerHTML = events
    .map((event) => {
      const primaryFeatureId = event.featureIds?.[0] || state.selectedFeatureId;
      const lane = laneMap.get(primaryFeatureId) ?? 0;
      const feature = getFeature(primaryFeatureId);
      return `
        <article class="graph-row ${event.featureIds?.includes(state.selectedFeatureId) ? "is-selected" : ""}" data-feature-id="${escapeAttribute(primaryFeatureId)}">
          <time>${escapeHtml(formatShortDate(event.date))}</time>
          <div class="graph-lanes" aria-hidden="true">
            ${[0, 1, 2, 3, 4].map((index) => `
              <span class="graph-lane ${index === lane ? `is-dot ${getAreaClass(feature?.area)}` : ""}"></span>
            `).join("")}
          </div>
          <div class="graph-event">
            <div class="graph-event-head">
              <span class="event-type">${escapeHtml(eventLabels[event.type] || event.type)}</span>
              ${event.sha ? `<a href="${escapeAttribute(event.url)}" target="_blank" rel="noreferrer">${escapeHtml(event.sha)}</a>` : ""}
            </div>
            <h4>${escapeHtml(event.title)}</h4>
            <p>${escapeHtml(event.summary || "")}</p>
          </div>
        </article>
      `;
    })
    .join("");

  el.progressGraph.querySelectorAll("[data-feature-id]").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedFeatureId = row.dataset.featureId;
      render();
    });
  });
}

function renderDetail() {
  const feature = getFeature(state.selectedFeatureId) || getFilteredFeatures()[0];
  if (!feature) {
    el.featureDetail.innerHTML = "";
    return;
  }

  const events = (state.data.events || []).filter((event) => event.featureIds?.includes(feature.id));
  const sources = (state.data.sources || []).filter((source) => source.relatedFeatureIds?.includes(feature.id));

  el.featureDetail.innerHTML = `
    <div class="detail-card">
      <div class="detail-head">
        <span class="detail-icon ${getAreaClass(feature.area)}">
          <i data-lucide="${statusIcons[feature.status] || "circle"}" aria-hidden="true"></i>
        </span>
        <div>
          <p class="eyebrow">${escapeHtml(feature.area)}</p>
          <h3>${escapeHtml(feature.title)}</h3>
        </div>
      </div>
      <p class="detail-goal">${escapeHtml(feature.goal || "")}</p>
      <div class="detail-meta">
        <span>${escapeHtml(statusLabels[feature.status] || feature.status)}</span>
        <span>${Number(feature.commitCount || 0)} commits</span>
        <span>${escapeHtml(formatShortDate(feature.updatedAt))}</span>
      </div>
    </div>

    <div class="detail-block">
      <h4>次アクション</h4>
      <ul>${(feature.nextActions || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>

    <div class="detail-block">
      <h4>関連コミット</h4>
      <div class="mini-list">
        ${(feature.commits || []).slice(0, 8).map((commit) => `
          <a href="${escapeAttribute(commit.url)}" target="_blank" rel="noreferrer">
            <strong>${escapeHtml(commit.sha)}</strong>
            <span>${escapeHtml(commit.message)}</span>
          </a>
        `).join("") || `<p class="empty-copy">まだコミットはありません</p>`}
      </div>
    </div>

    <div class="detail-block">
      <h4>判断・情報</h4>
      <div class="mini-list">
        ${events.filter((event) => event.type !== "commit").slice(0, 6).map((event) => `
          <article>
            <strong>${escapeHtml(event.title)}</strong>
            <span>${escapeHtml(event.summary || "")}</span>
          </article>
        `).join("") || `<p class="empty-copy">追加情報はまだありません</p>`}
      </div>
    </div>

    <div class="detail-block">
      <h4>外部ソース</h4>
      <div class="mini-list">
        ${sources.map((source) => `
          <a href="${escapeAttribute(source.url || "#")}" target="_blank" rel="noreferrer">
            <strong>${escapeHtml(source.title)}</strong>
            <span>${escapeHtml(source.sourceType)}</span>
          </a>
        `).join("") || `<p class="empty-copy">紐づくソースはまだありません</p>`}
      </div>
    </div>
  `;
}

function renderRoadmap() {
  el.roadmapGrid.innerHTML = (state.data.roadmap || [])
    .map((phase) => `
      <article class="roadmap-card ${phase.status}">
        <span>${escapeHtml(phase.phase)}</span>
        <h4>${escapeHtml(phase.title)}</h4>
        <p>${escapeHtml(phase.summary)}</p>
      </article>
    `)
    .join("");
}

function renderSourceSummaries() {
  el.sourceSummaryList.innerHTML = (state.data.sources || [])
    .map((source) => `
      <article class="summary-card">
        <div class="summary-head">
          <span class="summary-type">${escapeHtml(source.sourceType)}</span>
          ${source.url ? `<a href="${escapeAttribute(source.url)}" target="_blank" rel="noreferrer"><i data-lucide="external-link" aria-hidden="true"></i></a>` : ""}
        </div>
        <h4>${escapeHtml(source.title)}</h4>
        <p>${escapeHtml(source.summary)}</p>
      </article>
    `)
    .join("");
}

function renderSessionSummaries() {
  el.sessionSummaryList.innerHTML = (state.data.sessions || [])
    .map((session) => `
      <article class="summary-card">
        <div class="summary-head">
          <span class="summary-type">${escapeHtml(session.date)}</span>
        </div>
        <h4>${escapeHtml(session.title)}</h4>
        <p>${escapeHtml(session.summary)}</p>
      </article>
    `)
    .join("");
}

function renderMemoOptions() {
  const current = el.memoFeature.value || state.selectedFeatureId;
  el.memoFeature.innerHTML = [
    `<option value="">未指定</option>`,
    ...(state.data.features || []).map((feature) => `
      <option value="${escapeAttribute(feature.id)}">${escapeHtml(feature.title)}</option>
    `),
  ].join("");
  el.memoFeature.value = current;
}

async function submitMemo(event) {
  event.preventDefault();
  el.memoResult.textContent = "送信中...";
  const payload = {
    title: el.memoTitle.value.trim(),
    featureId: el.memoFeature.value,
    sourceUrl: el.memoSourceUrl.value.trim(),
    note: el.memoNote.value.trim(),
  };

  try {
    const response = await fetch("/api/memos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "保存できませんでした");
    const link = data.issueUrl
      ? `<a href="${escapeAttribute(data.issueUrl)}" target="_blank" rel="noreferrer">GitHub Issueを開く</a>`
      : "";
    el.memoResult.innerHTML = `${escapeHtml(data.message || "登録しました")} ${link}`;
    el.memoForm.reset();
    renderMemoOptions();
  } catch (error) {
    el.memoResult.textContent = error instanceof Error ? error.message : "保存できませんでした";
  }
}

function getFilteredFeatures() {
  return (state.data.features || []).filter((feature) => {
    if (state.area !== "all" && feature.area !== state.area) return false;
    if (state.status !== "all" && feature.status !== state.status) return false;
    if (!state.query) return true;
    const haystack = [
      feature.title,
      feature.area,
      feature.status,
      feature.goal,
      ...(feature.nextActions || []),
      ...(feature.commitScopes || []),
    ].join(" ").toLowerCase();
    return haystack.includes(state.query);
  });
}

function getFilteredEvents() {
  const featureIds = new Set(getFilteredFeatures().map((feature) => feature.id));
  return (state.data.events || [])
    .filter((event) => state.eventType === "all" || event.type === state.eventType)
    .filter((event) => {
      if (!event.featureIds?.length) return true;
      return event.featureIds.some((featureId) => featureIds.has(featureId));
    })
    .filter((event) => {
      if (!state.query) return true;
      return [event.title, event.summary, event.type, event.sha].join(" ").toLowerCase().includes(state.query);
    })
    .slice(0, 80);
}

function ensureSelectedFeature() {
  const features = getFilteredFeatures();
  if (!features.length) {
    state.selectedFeatureId = "";
    return;
  }
  if (!features.some((feature) => feature.id === state.selectedFeatureId)) {
    state.selectedFeatureId = features[0].id;
  }
}

function getFeature(id) {
  return (state.data.features || []).find((feature) => feature.id === id);
}

function getAreaClass(area) {
  const areas = [...new Set((state.data?.features || []).map((feature) => feature.area).filter(Boolean))].sort();
  const index = Math.max(areas.indexOf(area), 0);
  return `area-${areaColors[index % areaColors.length]}`;
}

function renderError(message) {
  el.progressGraph.innerHTML = `
    <div class="graph-empty is-error">
      <i data-lucide="triangle-alert" aria-hidden="true"></i>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
  renderIcons();
}

function setLoading(loading) {
  el.refreshButton.disabled = loading;
  el.refreshButton.classList.toggle("is-loading", loading);
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    el.toast.classList.remove("is-visible");
  }, 1800);
}

function formatShortDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function renderIcons() {
  if (window.lucide) window.lucide.createIcons();
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
  return escapeHtml(value);
}
