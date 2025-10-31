document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const animeId = params.get('id');

  const reviewsList = document.getElementById('reviewsList');
  const form = document.getElementById('reviewForm');
  const inputUser = document.getElementById('reviewUser');
  const inputScore = document.getElementById('reviewScore');
  const inputText = document.getElementById('reviewText');
  const formMsg = document.getElementById('reviewFormMsg');

  if (!animeId) {
    if (reviewsList) {
      reviewsList.innerHTML = `
        <div class="error">
          <h3>❌ Missing ID</h3>
          <p>No anime id provided in the URL.</p>
        </div>
      `;
    }
    if (form) form.style.display = 'none';
    return;
  }

  async function loadReviews() {
    try {
      reviewsList.innerHTML = `
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading reviews...</p>
        </div>
      `;
      const res = await fetch(`/api/anime/${encodeURIComponent(animeId)}/reviews`);
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Failed to load reviews');
      renderReviews(result.data || []);
    } catch (err) {
      reviewsList.innerHTML = `
        <div class="error">
          <h3>❌ Error Loading Reviews</h3>
          <p>${escapeHtml(err.message)}</p>
        </div>
      `;
    }
  }

  function renderReviews(rows) {
    if (!rows.length) {
      reviewsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h2>No reviews yet</h2>
          <p>Be the first to write one.</p>
        </div>
      `;
      return;
    }

    const list = document.createElement('div');
    list.className = 'reviews-list';

    rows.forEach(row => {
      const item = document.createElement('div');
      item.className = 'review-item';
      item.style.cssText = 'border:1px solid #e5e7eb; border-radius:8px; padding:12px; margin-bottom:10px; background:#fff;';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:6px;';

      const left = document.createElement('div');
      left.innerHTML = `<strong>${escapeHtml(row.user || 'Anonymous')}</strong>`
        + (row.score != null && row.score !== '' ? ` • <span title="Score">⭐ ${escapeHtml(String(row.score))}</span>` : '')
        + (row.postDate || row.postTime ? ` • <span style="color:#666;">${escapeHtml([row.postDate, row.postTime].filter(Boolean).join(' '))}</span>` : '');

      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.className = 'refresh-btn';
      delBtn.style.cssText = 'padding:6px 10px; font-size:12px;';
      delBtn.addEventListener('click', async () => {
        if (!confirm('Delete this review?')) return;
        try {
          const res = await fetch(`/api/reviews/${encodeURIComponent(row.id)}`, { method: 'DELETE' });
          const result = await res.json();
          if (!result.success) throw new Error(result.message || 'Failed to delete');
          await loadReviews();
        } catch (err) {
          alert('Delete failed: ' + err.message);
        }
      });

      header.appendChild(left);
      header.appendChild(delBtn);

      const body = document.createElement('div');
      body.className = 'review-body';
      // Use pre-line so we preserve line breaks but collapse long space runs.
      body.style.cssText = 'white-space:pre-line; line-height:1.5; color:#111827;';
      const normalized = String(row.review || '')
        .replace(/\r\n/g, '\n')        // normalize CRLF to LF
        .replace(/[ \t]{2,}/g, ' ')     // collapse 2+ spaces/tabs
        .replace(/\n{3,}/g, '\n\n');  // collapse 3+ blank lines to max 2
      body.textContent = normalized;

      item.appendChild(header);
      item.appendChild(body);
      list.appendChild(item);
    });

    reviewsList.innerHTML = '';
    reviewsList.appendChild(list);
  }

  function escapeHtml(unsafe) {
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      formMsg.textContent = '';
      const user = (inputUser.value || '').trim();
      const scoreVal = (inputScore.value || '').trim();
      const review = (inputText.value || '').trim();

      if (!review) {
        formMsg.textContent = 'Please enter a review.';
        return;
      }

      const payload = {
        user: user || undefined,
        score: scoreVal === '' ? undefined : Number(scoreVal),
        review
      };

      try {
        const res = await fetch(`/api/anime/${encodeURIComponent(animeId)}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.message || 'Failed to submit');
        // Reset form and reload
        form.reset();
        formMsg.textContent = 'Review submitted!';
        await loadReviews();
        setTimeout(() => { formMsg.textContent = ''; }, 1500);
      } catch (err) {
        formMsg.textContent = 'Error: ' + err.message;
      }
    });
  }

  loadReviews();
});
