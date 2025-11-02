// reviews.js
const API_BASE =
  window._API_BASE ||
  (location.hostname === "localhost" ? "http://localhost:5000" : "");

const listEl = document.getElementById("reviewsList");
const form = document.getElementById("reviewForm");
const msg = document.getElementById("reviewFormMsg");

async function loadReviews() {
  const animeId = window.__ANIME_ID__;
  if (!animeId) return;

  // If you add a backend route /api/reviews?anime_id=..., this will show them.
  try {
    const res = await fetch(`${API_BASE}/api/reviews?anime_id=${animeId}`);
    if (!res.ok) throw new Error("no reviews api");
    const data = await res.json();
    if (!data.length) {
      listEl.innerHTML = `<p style="color:#666;">No reviews yet.</p>`;
      return;
    }
    listEl.innerHTML = data.map(r => `
      <div style="padding:10px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;">
        <div style="font-weight:600">${r.user || "Anonymous"} — ⭐ ${r.score ?? "NA"}</div>
        <div>${r.text || ""}</div>
      </div>
    `).join("");
  } catch {
    // graceful fallback if you haven't built the endpoint yet
    listEl.innerHTML = `<p style="color:#666;">Reviews backend not wired yet.</p>`;
  }
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const animeId = window.__ANIME_ID__;
  const user = document.getElementById("reviewUser").value.trim() || null;
  const score = document.getElementById("reviewScore").value ? Number(document.getElementById("reviewScore").value) : null;
  const text = document.getElementById("reviewText").value.trim();

  if (!text) {
    msg.textContent = "Please write something."; return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anime_id: animeId, user, score, text })
    });
    if (!res.ok) throw new Error(await res.text());
    msg.textContent = "Thanks for your review!";
    form.reset();
    loadReviews();
  } catch {
    msg.textContent = "Submit failed (backend not ready).";
  }
});

document.addEventListener("DOMContentLoaded", loadReviews);
