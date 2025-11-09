document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  const registerMessage = document.getElementById('registerMessage');

  // Check if user is already logged in
  const currentUser = sessionStorage.getItem('currentUser');
  if (currentUser) {
    window.location.href = '/';
    return;
  }

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerMessage.textContent = '';
    registerMessage.className = 'message';

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    if (!username || !password || !confirmPassword) {
      showMessage('Please fill in all fields', 'error');
      return;
    }

    if (username.length < 3) {
      showMessage('Username must be at least 3 characters long', 'error');
      return;
    }

    if (password.length < 6) {
      showMessage('Password must be at least 6 characters long', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showMessage('Passwords do not match', 'error');
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (result.success) {
        showMessage('Registration successful! Redirecting to login...', 'success');
        
        // Redirect to login page after a brief delay
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 1500);
      } else {
        showMessage(result.message || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('Registration error:', error);
      showMessage('An error occurred. Please try again.', 'error');
    }
  });

  function showMessage(text, type) {
    registerMessage.textContent = text;
    registerMessage.className = `message ${type}`;
  }
});
