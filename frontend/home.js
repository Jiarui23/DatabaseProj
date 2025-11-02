// home.js

const API_BASE = window.location.origin; // e.g. http://localhost:5000


const $ = (s) => document.querySelector(s);
const content = $("#content");
const searchInput = $("#searchInput");
const searchBtn = $("#searchBtn");
const refreshBtn = $("#refreshBtn");

function rowHTML(a) {
  const genres = (a.genres || []).join(", ");
  const link = `details.html?id=${encodeURIComponent(a.anime_id)}`;
  return `<li>
    <a class="title-link" href="${link}">${a.title}</a>
    <div style="color:#555;font-size:13px;">
      ⭐ ${a.score ?? "NA"} • ${genres}
    </div>
  </li>`;
}

async function load({ q = "", genre = "", minScore = 0, page = 1, limit = 25 } = {}) {
  content.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading titles...</p>
    </div>
  `;
  try {
    const url = new URL("/api/anime", API_BASE);          // in home.js list call
// and
    if (q) url.searchParams.set("q", q);
    if (genre) url.searchParams.set("genre", genre);
    url.searchParams.set("minScore", String(minScore));
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();

    if (!data.length) {
      content.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">😶‍🌫️</div>
        <p>No anime found. Try another search.</p>
      </div>`;
      return;
    }

    content.innerHTML = `
      <ul class="title-list">
        ${data.map(rowHTML).join("")}
      </ul>
    `;
  } catch (e) {
    content.innerHTML = `<div class="error">
      <h3>Failed to load</h3>
      <pre>${e.message}</pre>
    </div>`;
  }
}

searchBtn?.addEventListener("click", () => load({ q: searchInput.value.trim(), minScore: 0 }));
searchInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") load({ q: searchInput.value.trim(), minScore: 0 });
});
refreshBtn?.addEventListener("click", () => load({ q: searchInput.value.trim(), minScore: 0 }));

// first load
load({ minScore: 8 });
