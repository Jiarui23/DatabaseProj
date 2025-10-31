document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const content = document.getElementById('content');

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

        <section class="synopsis-panel">
          <h2>Synopsis</h2>
          <div class="synopsis-content">${synopsis}</div>
        </section>

        <p class="back-link"><a href="/">← Back to list</a></p>
      </div>
    `;

    content.innerHTML = html;
  }

  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  loadDetails();
});
