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

    const currentUser = localStorage.getItem('currentUser');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    const list = document.createElement('div');
    list.className = 'reviews-list';

    rows.forEach(row => {
      const item = document.createElement('div');
      item.className = 'review-item';
      item.id = `review-${row.id}`;
      item.style.cssText = 'border:1px solid #e5e7eb; border-radius:8px; padding:12px; margin-bottom:10px; background:#fff;';

      const header = document.createElement('div');
      header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:6px;';

      const left = document.createElement('div');
      left.innerHTML = `<strong>${escapeHtml(row.user || 'Anonymous')}</strong>`
        + (row.score != null && row.score !== '' ? ` • <span title="Score">⭐ ${escapeHtml(String(row.score))}</span>` : '')
        + (row.postDate || row.postTime ? ` • <span style="color:#666;">${escapeHtml([row.postDate, row.postTime].filter(Boolean).join(' '))}</span>` : '');

      header.appendChild(left);

      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = 'display:flex; gap:8px;';

      // Show edit button only for review owner (not admin)
      const isOwner = currentUser && currentUser === row.user;
      if (isOwner) {
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Edit';
        editBtn.className = 'edit-btn';
        editBtn.style.cssText = 'padding:6px 10px; font-size:12px; background:#667eea; color:white; border:none; border-radius:6px; cursor:pointer;';
        editBtn.addEventListener('click', () => enableEditMode(row, item));
        buttonContainer.appendChild(editBtn);
      }

      // Show delete button for admin or owner
      const canDelete = isAdmin || isOwner;
      if (canDelete) {
        const delBtn = document.createElement('button');
        delBtn.textContent = 'Delete';
        delBtn.className = 'delete-btn';
        delBtn.style.cssText = 'padding:6px 10px; font-size:12px; background:#f56565; color:white; border:none; border-radius:6px; cursor:pointer;';
        delBtn.addEventListener('click', async () => {
          if (!confirm('Delete this review?')) return;
          try {
            const userId = localStorage.getItem('userId');
            const res = await fetch(`/api/reviews/${encodeURIComponent(row.id)}`, { 
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: userId,
                isAdmin: isAdmin,
                username: currentUser
              })
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.message || 'Failed to delete');
            await loadReviews();
          } catch (err) {
            alert('Delete failed: ' + err.message);
          }
        });
        buttonContainer.appendChild(delBtn);
      }

      if (buttonContainer.children.length > 0) {
        header.appendChild(buttonContainer);
      }

      const body = document.createElement('div');
      body.className = 'review-body';
      body.style.cssText = 'white-space:pre-line; line-height:1.5; color:#111827;';
      const normalized = String(row.review || '')
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n');
      body.textContent = normalized;

      item.appendChild(header);
      item.appendChild(body);
      list.appendChild(item);
    });

    reviewsList.innerHTML = '';
    reviewsList.appendChild(list);
  }

  function enableEditMode(reviewData, itemElement) {
    const body = itemElement.querySelector('.review-body');
    const header = itemElement.querySelector('div');
    
    // Store original content
    const originalText = body.textContent;
    const originalScore = reviewData.score;

    // Create edit form
    const editForm = document.createElement('div');
    editForm.style.cssText = 'margin-top:10px;';

    const scoreLabel = document.createElement('label');
    scoreLabel.textContent = 'Score (0-10): ';
    scoreLabel.style.cssText = 'display:block; margin-bottom:4px; font-size:13px;';
    
    const scoreInput = document.createElement('input');
    scoreInput.type = 'number';
    scoreInput.min = '0';
    scoreInput.max = '10';
    scoreInput.value = originalScore || '';
    scoreInput.style.cssText = 'width:80px; padding:6px; border:1px solid #e5e7eb; border-radius:4px; margin-bottom:8px;';

    const textarea = document.createElement('textarea');
    textarea.value = originalText;
    textarea.style.cssText = 'width:100%; min-height:100px; padding:8px; border:1px solid #e5e7eb; border-radius:4px; font-family:inherit; font-size:14px; margin-bottom:8px;';

    const buttonGroup = document.createElement('div');
    buttonGroup.style.cssText = 'display:flex; gap:8px;';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save Changes';
    saveBtn.style.cssText = 'padding:8px 16px; font-size:13px; background:#667eea; color:white; border:none; border-radius:6px; cursor:pointer;';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = 'padding:8px 16px; font-size:13px; background:#718096; color:white; border:none; border-radius:6px; cursor:pointer;';

    const errorMsg = document.createElement('div');
    errorMsg.style.cssText = 'color:#f56565; font-size:13px; margin-top:8px;';

    // Disable edit and delete buttons during edit mode
    const editBtn = header.querySelector('.edit-btn');
    const deleteBtn = header.querySelector('.delete-btn');
    if (editBtn) editBtn.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true;

    saveBtn.addEventListener('click', async () => {
      const newText = textarea.value.trim();
      const newScore = scoreInput.value.trim();

      if (!newText) {
        errorMsg.textContent = 'Review text cannot be empty';
        return;
      }

      try {
        const userId = localStorage.getItem('userId');
        const username = localStorage.getItem('currentUser');

        const res = await fetch(`/api/reviews/${encodeURIComponent(reviewData.id)}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            username: username,
            score: newScore === '' ? null : Number(newScore),
            review: newText
          })
        });

        const result = await res.json();
        
        if (!result.success) {
          // Check for integrity constraint violation (review deleted by admin)
          if (result.code === 'REVIEW_DELETED') {
            errorMsg.textContent = result.message;
            errorMsg.style.cssText = 'color:#f56565; font-size:14px; font-weight:bold; margin-top:8px; padding:12px; background:#fee; border-radius:6px; border:1px solid #f56565;';
            
            // Disable save button, only allow cancel
            saveBtn.disabled = true;
            saveBtn.style.opacity = '0.5';
            saveBtn.style.cursor = 'not-allowed';
            return;
          }
          throw new Error(result.message || 'Failed to update review');
        }

        // Success - reload reviews
        await loadReviews();
      } catch (err) {
        errorMsg.textContent = 'Error: ' + err.message;
      }
    });

    cancelBtn.addEventListener('click', () => {
      // Restore original view
      body.textContent = originalText;
      body.style.display = 'block';
      editForm.remove();
      if (editBtn) editBtn.disabled = false;
      if (deleteBtn) deleteBtn.disabled = false;
    });

    buttonGroup.appendChild(saveBtn);
    buttonGroup.appendChild(cancelBtn);

    editForm.appendChild(scoreLabel);
    editForm.appendChild(scoreInput);
    editForm.appendChild(textarea);
    editForm.appendChild(buttonGroup);
    editForm.appendChild(errorMsg);

    // Hide original body and show edit form
    body.style.display = 'none';
    itemElement.appendChild(editForm);
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
      
      // Get current user from localStorage
      const currentUser = localStorage.getItem('currentUser');
      const user = currentUser || (inputUser.value || '').trim();
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
        
        // If logged in, clear the user input field
        if (currentUser && inputUser) {
          inputUser.style.display = 'none';
        }
        
        await loadReviews();
        setTimeout(() => { formMsg.textContent = ''; }, 1500);
      } catch (err) {
        formMsg.textContent = 'Error: ' + err.message;
      }
    });
    
    // Hide username input if user is logged in
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser && inputUser) {
      inputUser.value = currentUser;
      inputUser.style.display = 'none';
      const userLabel = inputUser.previousElementSibling;
      if (userLabel && userLabel.tagName === 'LABEL') {
        userLabel.style.display = 'none';
      }
    }
  }

  loadReviews();
});
