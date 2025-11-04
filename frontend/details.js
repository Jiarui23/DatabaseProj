document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const content = document.getElementById('content');
  const authSection = document.getElementById('authSection');

  // Initialize auth UI
  updateAuthUI();

  if (!id) {
    content.innerHTML = `
      <div class="error">
        <h3>❌ Missing ID</h3>
        <p>No anime id provided in the URL.</p>
      </div>
    `;
    return;
  }

  async function loadDetails() {
    content.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading anime details...</p>
      </div>
    `;
    try {
      const res = await fetch(`/api/anime/${encodeURIComponent(id)}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Failed to load');
      renderDetails(result.data);
    } catch (err) {
      content.innerHTML = `
        <div class="error">
          <h3>❌ Error Loading Details</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  }

  async function loadGenresInline(animeId) {
    const container = document.getElementById('genresInline');
    if (!container) return;
    try {
      const res = await fetch(`/api/anime/${encodeURIComponent(animeId || id)}/genres`);
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Failed to load genres');
      const rows = Array.isArray(result.data) ? result.data : [];
      if (rows.length === 0) {
        container.innerHTML = '<em>—</em>';
        return;
      }
      const names = rows
        .map(g => String(g.name ?? g.genres ?? '').trim())
        .filter(Boolean);
      if (!names.length) {
        container.innerHTML = '<em>—</em>';
        return;
      }
      container.innerHTML = `
        <span style="display:inline-flex; gap:8px; flex-wrap:wrap; align-items:center;">
          ${names.map(n => `<span class="genre-badge">${escapeHtml(n)}</span>`).join(' ')}
        </span>
      `;
    } catch (err) {
      container.innerHTML = `
        <div class="error">
          <h3>❌ Error Loading Genres</h3>
          <p>${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  }

  function renderDetails(row) {
    const fields = [
      ['Title', row.title],
      ['Type', row.type],
      ['Source', row.source_type],
      ['Episodes', row.num_episodes],
      ['Status', row.status],
      ['Season', row.season],
      ['Start Date', row.start_date],
      ['End Date', row.end_date],
      ['Score', row.score],
      ['Rank', row.score_rank]
    ];

    const synopsis = row.synopsis == null || row.synopsis === '' ? '<em>—</em>' : escapeHtml(String(row.synopsis));

    const html = `
      <div class="details">
        <h1>${row.title || 'Untitled'}</h1>
        <dl class="details-grid">
          ${fields.map(([label, value]) => `
            <div class="detail-item">
              <dt>${label}</dt>
              <dd>${value == null || value === '' ? '<em>—</em>' : escapeHtml(String(value))}</dd>
            </div>
          `).join('')}
        </dl>
        <div class="genres-inline" style="margin:8px 0 0 0; color:#111827; font-size:14px;">
          <strong>Genres:</strong> <span id="genresInline"><em>Loading genres...</em></span>
        </div>

        <section class="synopsis-panel">
          <h2>Synopsis</h2>
          <div class="synopsis-content">${synopsis}</div>
        </section>

        <p class="back-link"><a href="/">← Back to list</a></p>
      </div>
    `;

    content.innerHTML = html;
    loadGenresInline(row.anime_id);
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Auth UI functions
  function updateAuthUI() {
    const currentUser = localStorage.getItem('currentUser');
    
    if (currentUser) {
      authSection.innerHTML = `
        <div class="user-menu">
          <span class="user-name">👤 ${escapeHtml(currentUser)}</span>
          <button class="logout-btn" id="logoutBtn">Logout</button>
        </div>
      `;
      
      const logoutBtn = document.getElementById('logoutBtn');
      logoutBtn.addEventListener('click', handleLogout);
    } else {
      authSection.innerHTML = `
        <div class="auth-links">
          <a href="login.html">Login</a>
          <a href="register.html">Register</a>
        </div>
      `;
    }
  }

  function handleLogout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userId');
    localStorage.removeItem('isAdmin');
    updateAuthUI();
    alert('You have been logged out successfully');
  }

  loadDetails();
});
