// Same-origin server function. It avoids a CORS failure inside Telegram WebView.
const API_URL = "/api/alliance";
const DAY = 24 * 60 * 60 * 1000;
const tg = window.Telegram?.WebApp;

const state = { data: null, players: [], filter: "all", query: "" };

const formatNumber = new Intl.NumberFormat("ru-RU");
const formatCompact = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" });

function ageInDays(joined, asOf) {
  return Number.isFinite(joined) ? Math.max(0, (asOf * 1000 - joined) / DAY) : null;
}

function getStatus(player, asOf) {
  const age = ageInDays(player.joined, asOf);
  const missing = player.activity == null || player.joined == null;
  const isNew = age !== null && age < 7;
  const lowActivity = player.activity != null && player.activity <= 200;
  const lowGrowth = player.growth7d != null && player.growth7d <= 3_000_000;

  if (missing) return { key: "missing", label: "Нет данных", reason: "Не заполнена активность или дата вступления." };
  if (isNew) return { key: "new", label: "Новичок", reason: `В альянсе ${Math.max(1, Math.ceil(age))} дн.; оценивать после 7 дней.` };
  if (lowActivity && lowGrowth) return { key: "critical", label: "Критично", reason: "Низкая недельная активность и слабый прирост мощности." };
  if (lowActivity || lowGrowth) return { key: "watch", label: "Проверить", reason: lowActivity ? "Низкая активность в альянсе за неделю." : "Низкий прирост мощности за 7 дней." };
  return { key: "good", label: "Норма", reason: "Показатели выше порогов проверки." };
}

function preparePlayers(data) {
  return data.roster.map(player => ({ ...player, status: getStatus(player, data.asOf) }));
}

function updateHeader(data) {
  document.querySelector("#alliance-name").textContent = `[${data.tag}] ${data.name}`;
  document.querySelector("#alliance-meta").textContent = `Сервер #${data.server} · уровень ${data.level}`;
  document.querySelector("#updated-at").textContent = `Снимок данных: ${dateFormatter.format(new Date(data.asOf * 1000))}`;
}

function renderSummary() {
  const { data, players } = state;
  const attention = players.filter(p => ["critical", "watch", "missing"].includes(p.status.key));
  const newcomers = players.filter(p => p.status.key === "new");
  document.querySelector("#metric-members").textContent = formatNumber.format(data.members);
  document.querySelector("#metric-power").textContent = formatCompact.format(data.power);
  document.querySelector("#metric-attention").textContent = formatNumber.format(attention.length);
  document.querySelector("#metric-newcomers").textContent = formatNumber.format(newcomers.length);
}

function statusBadge(status) {
  return `<span class="badge badge-${status.key}">${status.label}</span>`;
}

function renderAttention() {
  const target = document.querySelector("#attention-list");
  const priority = { critical: 0, watch: 1, missing: 2 };
  const players = state.players
    .filter(p => ["critical", "watch", "missing"].includes(p.status.key))
    .sort((a, b) => (priority[a.status.key] - priority[b.status.key]) || (a.activity ?? -1) - (b.activity ?? -1));

  if (!players.length) {
    target.innerHTML = `<article class="attention-card"><strong>Срочных проверок нет</strong><p class="reason">Все игроки либо выше порогов, либо ещё проходят период новичка.</p></article>`;
    return;
  }

  target.innerHTML = players.map(player => `
    <article class="attention-card">
      <div class="player-line"><div><div class="player-name">${escapeHtml(player.name)}</div><div class="player-subtitle">${formatCompact.format(player.power)} мощи · замок ${player.castle ?? "—"}</div></div>${statusBadge(player.status)}</div>
      <p class="reason">${player.status.reason} Активность: ${player.activity ?? "—"}; рост 7 д: ${player.growth7d == null ? "—" : formatCompact.format(player.growth7d)}.</p>
    </article>`).join("");
}

function renderTable() {
  const query = state.query.trim().toLocaleLowerCase();
  const filtered = state.players.filter(player => {
    const matchesQuery = !query || player.name.toLocaleLowerCase().includes(query);
    const matchesFilter = state.filter === "all" || (state.filter === "attention" && ["critical", "watch"].includes(player.status.key)) || player.status.key === state.filter;
    return matchesQuery && matchesFilter;
  });
  const body = document.querySelector("#players-body");
  body.innerHTML = filtered.map(player => `<tr>
    <td><strong>${escapeHtml(player.name)}</strong><br><span class="caption">${player.rank ? `R${player.rank}` : "—"} · замок ${player.castle ?? "—"}</span></td>
    <td>${player.activity ?? "—"}</td>
    <td>${player.growth7d == null ? "—" : formatCompact.format(player.growth7d)}</td>
    <td>${statusBadge(player.status)}</td>
  </tr>`).join("") || `<tr><td colspan="4" class="muted">Игроки не найдены.</td></tr>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

async function loadData() {
  document.querySelector("#error-card").classList.add("hidden");
  document.querySelector("#refresh-button").disabled = true;
  try {
    const response = await fetch(API_URL, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Сервис ответил кодом ${response.status}.`);
    const data = await response.json();
    if (!Array.isArray(data.roster)) throw new Error("API вернул данные в неизвестном формате.");
    state.data = data;
    state.players = preparePlayers(data);
    updateHeader(data);
    renderSummary();
    renderAttention();
    renderTable();
    document.querySelector("#dashboard").classList.remove("hidden");
  } catch (error) {
    document.querySelector("#error-message").textContent = `${error.message} Проверьте доступность API или настройте серверный прокси для Mini App.`;
    document.querySelector("#error-card").classList.remove("hidden");
  } finally {
    document.querySelector("#refresh-button").disabled = false;
  }
}

document.querySelector("#refresh-button").addEventListener("click", loadData);
document.querySelector("#retry-button").addEventListener("click", loadData);
document.querySelector("#player-search").addEventListener("input", event => { state.query = event.target.value; renderTable(); });
document.querySelectorAll(".filter").forEach(button => button.addEventListener("click", () => {
  document.querySelectorAll(".filter").forEach(item => item.classList.remove("active"));
  button.classList.add("active");
  state.filter = button.dataset.filter;
  renderTable();
}));
document.querySelector("#rules-button").addEventListener("click", () => document.querySelector("#rules-dialog").showModal());
document.querySelector("#close-rules").addEventListener("click", () => document.querySelector("#rules-dialog").close());

if (tg) {
  tg.ready();
  tg.expand();
  document.documentElement.style.setProperty("--bg", tg.themeParams.bg_color || "#10151b");
  document.documentElement.style.setProperty("--text", tg.themeParams.text_color || "#edf3f8");
}

loadData();
