// Shared navbar component
function loadNavbar() {
  const navbarHTML = `
    <div class="navbar">
      <div class="brand-container">
        <a href="/">
          <img src="logo.jpeg" alt="Anime Hub Logo" class="logo" />
        </a>
        <a class="brand" href="/">Anime Hub</a>
      </div>
      <div class="search">
        <div class="autocomplete-container">
          <input id="searchInput" type="text" placeholder="Search anime..." autocomplete="off" />
          <div id="autocompleteDropdown" class="autocomplete-dropdown"></div>
        </div>
        <button id="searchBtn" type="button">Search</button>
      </div>
      <div id="authSection"></div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('afterbegin', navbarHTML);
}

// Load navbar when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadNavbar);
} else {
  loadNavbar();
}
