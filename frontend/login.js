document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');

  // Check if user is already logged in
  const currentUser = localStorage.getItem('currentUser');
  if (currentUser) {
    window.location.href = '/';
    return;
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginMessage.textContent = '';
    loginMessage.className = 'message';

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showMessage('Please fill in all fields', 'error');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (result.success) {
        showMessage('Login successful! Redirecting...', 'success');
        
        // Store user info in localStorage
        localStorage.setItem('currentUser', result.data.username);
        localStorage.setItem('userId', result.data.id);
        localStorage.setItem('isAdmin', result.data.is_admin ? 'true' : 'false');
        
        // Redirect to home page after a brief delay
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        showMessage(result.message || 'Login failed', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showMessage('An error occurred. Please try again.', 'error');
    }
  });

  function showMessage(text, type) {
    loginMessage.textContent = text;
    loginMessage.className = `message ${type}`;
  }
});
