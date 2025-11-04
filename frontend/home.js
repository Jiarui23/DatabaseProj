document.addEventListener('DOMContentLoaded', () => {
  const API_URL = '';
  const content = document.getElementById('content');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const stats = document.getElementById('stats');
  const recordCount = document.getElementById('recordCount');
  const columnCount = document.getElementById('columnCount');
  const authSection = document.getElementById('authSection');
  const autocompleteDropdown = document.getElementById('autocompleteDropdown');

  let autocompleteTimeout = null;

  // Initialize auth UI
  updateAuthUI();
  
  // Setup autocomplete
  if (autocompleteDropdown) {
    setupAutocomplete();
  }

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

  function escapeHtml(unsafe) {
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Autocomplete functionality
  function setupAutocomplete() {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      // Clear previous timeout
      if (autocompleteTimeout) {
        clearTimeout(autocompleteTimeout);
      }
      
      // Hide dropdown if query is too short
      if (query.length < 2) {
        autocompleteDropdown.classList.remove('show');
        return;
      }
      
      // Debounce: wait 300ms after user stops typing
      autocompleteTimeout = setTimeout(() => {
        fetchAutocomplete(query);
      }, 300);
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
        autocompleteDropdown.classList.remove('show');
      }
    });

    // Handle enter key to select first item or search
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const firstItem = autocompleteDropdown.querySelector('.autocomplete-item');
        if (firstItem && autocompleteDropdown.classList.contains('show')) {
          e.preventDefault();
          firstItem.click();
        }
      } else if (e.key === 'Escape') {
        autocompleteDropdown.classList.remove('show');
      }
    });
  }

  async function fetchAutocomplete(query) {
    try {
      console.log('[Frontend] Fetching autocomplete for:', query);
      autocompleteDropdown.innerHTML = '<div class="autocomplete-loading">Searching...</div>';
      autocompleteDropdown.classList.add('show');

      const url = `/api/anime/autocomplete?q=${encodeURIComponent(query)}`;
      console.log('[Frontend] Fetch URL:', url);
      const res = await fetch(url);
      console.log('[Frontend] Response status:', res.status);
      const result = await res.json();
      console.log('[Frontend] Response data:', result);

      if (result.success && result.data.length > 0) {
        console.log('[Frontend] Rendering', result.data.length, 'results');
        renderAutocomplete(result.data);
      } else {
        console.log('[Frontend] No results found');
        autocompleteDropdown.innerHTML = '<div class="autocomplete-empty">No anime found</div>';
      }
    } catch (error) {
      console.error('[Frontend] Autocomplete error:', error);
      autocompleteDropdown.innerHTML = '<div class="autocomplete-empty">Error loading suggestions</div>';
    }
  }

  function renderAutocomplete(items) {
    autocompleteDropdown.innerHTML = '';
    
    items.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'autocomplete-item';
      
      const title = document.createElement('div');
      title.className = 'autocomplete-title';
      title.textContent = item.title || 'Untitled';
      
      // Show ranking info if available
      if (item.score_rank || item.score) {
        const meta = document.createElement('div');
        meta.className = 'autocomplete-meta';
        
        if (item.score_rank) {
          const rank = document.createElement('span');
          rank.className = 'autocomplete-rank';
          rank.textContent = `Rank #${item.score_rank}`;
          meta.appendChild(rank);
        }
        
        if (item.score) {
          const score = document.createElement('span');
          score.className = 'autocomplete-score';
          score.textContent = `⭐ ${item.score}`;
          meta.appendChild(score);
        }
        
        div.appendChild(title);
        div.appendChild(meta);
      } else {
        div.appendChild(title);
      }
      
      div.addEventListener('click', () => {
        window.location.href = `anime.html?id=${encodeURIComponent(item.anime_id)}`;
      });
      
      // Highlight first item
      if (index === 0) {
        div.style.background = '#f9fafb';
      }
      
      autocompleteDropdown.appendChild(div);
    });
    
    autocompleteDropdown.classList.add('show');
  }
});
