'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const API_URL = 'http://localhost:3000';
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const stats = document.getElementById('stats');
  const content = document.getElementById('content');
  let lastQuery = '';

  async function loadData() {
    content.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading data from database...</p>
      </div>
    `;
    stats.style.display = 'none';

    try {
      const url = lastQuery ? `${API_URL}/api/anime?q=${encodeURIComponent(lastQuery)}` : `${API_URL}/api/anime`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        displayTable(result.data);
      } else if (result.success && result.data.length === 0) {
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📭</div>
            <h2>No Data Found</h2>
            <p>The anime table is empty.</p>
          </div>
        `;
      } else {
        content.innerHTML = `
          <div class="error">
            <h3>❌ Error Loading Data</h3>
            <p>${result.message || 'Unknown error occurred'}</p>
            ${result.error ? `<pre>${result.error}</pre>` : ''}
          </div>
        `;
      }
    } catch (error) {
      content.innerHTML = `
        <div class="error">
          <h3>❌ Connection Failed</h3>
          <p>Cannot connect to backend server.</p>
          <p>Make sure the server is running on ${API_URL}</p>
          <pre>${error.message}</pre>
        </div>
      `;
    }
  }

  function displayTable(data) {
    const columns = ['Title','Type','Episodes','Score','Status','Season','Start Date','End Date','Synopsis'];

    // Update stats
    document.getElementById('recordCount').textContent = data.length;
    document.getElementById('columnCount').textContent = columns.length;
    stats.style.display = 'flex';

    let tableHTML = '<table><thead><tr>' + columns.map(c=>`<th>${c}</th>`).join('') + '</tr></thead><tbody>';

    const pick = (row, keys, fallback='') => {
      for (const k of keys) if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
      return fallback;
    };

    for (const row of data) {
      const title = pick(row, ['title','name'], 'Untitled');
      const type = pick(row, ['type','format'], '');
      const episodes = pick(row, ['num_episodes','episodes','eps'], '');
      const score = pick(row, ['score','rating','score_rank'], '');
      const status = pick(row, ['status'], '');
      const season = pick(row, ['season'], '');
      const startDate = pick(row, ['start_date','aired_from','start'], '');
      const endDate = pick(row, ['end_date','aired_to','end'], '');
      let synopsis = pick(row, ['synopsis','description','summary'], '');
      if (synopsis && synopsis.length > 220) synopsis = synopsis.slice(0, 220) + '…';

      tableHTML += '<tr>'
        + `<td><strong>${title}</strong></td>`
        + `<td>${type}</td>`
        + `<td>${episodes}</td>`
        + `<td>${score}</td>`
        + `<td>${status}</td>`
        + `<td>${season}</td>`
        + `<td>${startDate || ''}</td>`
        + `<td>${endDate || ''}</td>`
        + `<td>${synopsis}</td>`
        + '</tr>';
    }

    tableHTML += '</tbody></table>';
    content.innerHTML = tableHTML;
  }

  function applySearch() {
    lastQuery = (searchInput.value || '').trim();
    loadData();
  }

  searchBtn.addEventListener('click', applySearch);
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applySearch(); });
  refreshBtn.addEventListener('click', loadData);

  // Initial load
  loadData();
});
