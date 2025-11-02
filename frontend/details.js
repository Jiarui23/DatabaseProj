// details.js
// use same origin; no CORS/config needed
const API_BASE = window.location.origin; // e.g. http://localhost:5000

const url = new URL(`/api/anime/${animeId}`, API_BASE); // in details.js
const params = new URLSearchParams(location.search);
const animeId = Number(params.get("id"));
const content = document.getElementById("content");

if (!animeId) {
  content.innerHTML = `<div class="error"><h3>Missing anime id</h3></div>`;
} else {
  render();
}

async function render() {
  content.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading anime details...</p>
    </div>
  `;
  try {
    const res = await fetch(`${API_BASE}/api/anime/${animeId}`);
    if (!res.ok) throw new Error(await res.text());
    const a = await res.json();
    if (!a || !a.title) {
      content.innerHTML = `<div class="empty-state"><p>Anime not found.</p></div>`;
      return;
    }

    const genres = (a.genres || []).map(g => `<span class="genre-badge">${g}</span>`).join(" ");
    const studios = (a.studios || []).join(", ");
    const img = (a.images && a.images[0]) ? `<img src="${a.images[0]}" alt="${a.title}" style="max-width:260px;border-radius:8px;border:1px solid #e5e7eb;" />` : "";

    content.innerHTML = `
      <div class="details">
        <a class="back-link" href="index.html">← Back</a>
        <h1>${a.title}</h1>

        <div class="details-grid">
          <div class="detail-item"><dt>Score</dt><dd>${a.score ?? "NA"}</dd></div>
          <div class="detail-item"><dt>Episodes</dt><dd>${a.episodes ?? "?"}</dd></div>
          <div class="detail-item"><dt>Type</dt><dd>${a.type ?? "—"}</dd></div>
          <div class="detail-item"><dt>Members</dt><dd>${a.members ?? "—"}</dd></div>
          <div class="detail-item"><dt>Studios</dt><dd>${studios || "—"}</dd></div>
          <div class="detail-item"><dt>Genres</dt><dd>${genres || "—"}</dd></div>
        </div>

        <div class="synopsis-panel">
          <h2>Synopsis</h2>
          <div class="synopsis-content">${a.synopsis ?? "No synopsis available."}</div>
        </div>

        <div>${img}</div>
      </div>
    `;

    // expose id for reviews.js
    window.__ANIME_ID__ = animeId;
  } catch (e) {
    content.innerHTML = `<div class="error"><h3>Failed to load</h3><pre>${e.message}</pre></div>`;
  }
}
