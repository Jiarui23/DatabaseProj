document.addEventListener('DOMContentLoaded', () => {
  const API_URL = '';
  const content = document.getElementById('content');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const stats = document.getElementById('stats');
  const recordCount = document.getElementById('recordCount');
  const columnCount = document.getElementById('columnCount');

  function setLoading(message = 'Loading data from database...') {
    content.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
    if (stats) stats.style.display = 'none';
  }

  async function loadList(query = '') {
    setLoading('Loading titles...');
    try {
      const url = query ? `/api/anime?q=${encodeURIComponent(query)}` : '/api/anime';
      const res = await fetch(url);
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Failed to load data');
      renderTitleList(result.data || []);
    } catch (err) {
      content.innerHTML = `
        <div class="error">
          <h3>❌ Error Loading Titles</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  }

  function renderTitleList(rows) {
    // Update stats
    if (recordCount) recordCount.textContent = rows.length;
    if (columnCount) columnCount.textContent = 1;
    if (stats) stats.style.display = 'flex';

    if (!rows.length) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h2>No Results</h2>
          <p>Try a different search.</p>
        </div>
      `;
      return;
    }

    // Create a simple list of titles with hover and click
    const list = document.createElement('ul');
    list.className = 'title-list';

    rows.forEach(row => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.textContent = row.title || `Untitled #${row.anime_id}`;
      a.href = `anime.html?id=${encodeURIComponent(row.anime_id)}`;
      a.className = 'title-link';
      li.appendChild(a);
      list.appendChild(li);
    });

    content.innerHTML = '';
    content.appendChild(list);
  }

  function applySearch() {
    const q = (searchInput.value || '').trim();
    loadList(q);
  }

  // Wire events
  if (searchBtn) searchBtn.addEventListener('click', applySearch);
  if (searchInput) searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') applySearch(); });
  if (refreshBtn) refreshBtn.addEventListener('click', () => loadList((searchInput.value || '').trim()));

  // Initial load
  loadList();
});
