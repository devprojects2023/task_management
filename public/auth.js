// Show toast notification
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'exclamation-circle';
  
  toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
  toastContainer.appendChild(toast);
  
  // Remove toast after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      toastContainer.removeChild(toast);
    }, 300);
  }, 3000);
}

// Toggle password visibility
function togglePasswordVisibility(inputId) {
  const passwordInput = document.getElementById(inputId);
  const toggleIcon = passwordInput.nextElementSibling.querySelector('i');
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleIcon.classList.remove('fa-eye');
    toggleIcon.classList.add('fa-eye-slash');
  } else {
    passwordInput.type = 'password';
    toggleIcon.classList.remove('fa-eye-slash');
    toggleIcon.classList.add('fa-eye');
  }
}

// Redirect to reset password with token
function goToResetPassword() {
  const token = document.getElementById('reset-token-display').innerText;
  window.location.href = `/reset-password?token=${encodeURIComponent(token)}`;
}

// Initialize form handlers when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get the current form based on the page
  const currentPath = window.location.pathname;
  let currentForm = null;

  if (currentPath === '/login') {
    currentForm = document.getElementById('login-form');
  } else if (currentPath === '/register') {
    currentForm = document.getElementById('register-form');
  } else if (currentPath === '/forgot-password') {
    currentForm = document.getElementById('forgot-password-form');
  } else if (currentPath === '/reset-password') {
    currentForm = document.getElementById('reset-password-form');
  }

  // Add real-time validation feedback for register form
  if (currentPath === '/register') {
    document.querySelectorAll('#register-form input').forEach(input => {
      input.addEventListener('input', function() {
        const isValid = this.checkValidity();
        const hint = document.getElementById(`${this.id}-hint`);
        
        if (this.id === 'password') {
          const isPasswordValid = validatePassword(this.value);
          this.setCustomValidity(isPasswordValid ? '' : 'Invalid password format');
        }
        
        if (this.id === 'confirmPassword') {
          const password = document.getElementById('password').value;
          const isMatch = this.value === password;
          this.setCustomValidity(isMatch ? '' : 'Passwords do not match');
        }
        
        if (hint) {
          hint.style.color = isValid ? '#6c757d' : '#dc3545';
        }
      });
    });

    // Handle register form submission
    currentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = currentForm.querySelector('button[type="submit"]');
      const btnText = submitBtn.querySelector('.btn-text');
      const loadingSpinner = submitBtn.querySelector('.loading-spinner');
      
      // Disable form while submitting
      submitBtn.disabled = true;
      btnText.style.display = 'none';
      loadingSpinner.style.display = 'inline-block';
      
      const formData = {
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirmPassword').value
      };
      
      try {
        // Client-side validation
        if (!formData.username || !formData.email || !formData.phone || !formData.password) {
          throw new Error('All fields are required');
        }
        
        if (!validateEmail(formData.email)) {
          throw new Error('Please enter a valid email address');
        }
        
        if (!validatePhone(formData.phone)) {
          throw new Error('Please enter a valid 10-digit phone number');
        }
        
        if (!validatePassword(formData.password)) {
          throw new Error('Password does not meet the requirements');
        }
        
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
          // Save auth data
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          showToast('Registration successful! Redirecting to dashboard...', 'success');
          
          // Clear form
          currentForm.reset();
          
          // Redirect after a brief delay
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        } else {
          throw new Error(data.error || 'Registration failed. Please try again.');
        }
      } catch (error) {
        console.error('Registration error:', error);
        showToast(error.message, 'error');
      } finally {
        // Re-enable form
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        loadingSpinner.style.display = 'none';
      }
    });
  }
});

// Form validation functions
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);
  
  return password.length >= minLength && hasUpperCase && hasLowerCase && 
         hasNumbers && hasSpecialChar;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return /^\d{10}$/.test(phone);
}

// Handle login form submission
if (currentForm && currentPath === '/login') {
  currentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Save token and redirect
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        showToast('Login successful! Redirecting...', 'success');
        
        // Redirect to main page after a brief delay
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        showToast(data.error || 'Login failed', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showToast('Something went wrong. Please try again.', 'error');
    }
  });
}

// Handle forgot password form submission
if (currentForm && currentPath === '/forgot-password') {
  currentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Special handling for admin account
        if (data.adminReset) {
          const tokenSection = document.getElementById('reset-token-section');
          const form = document.getElementById('forgot-password-form');
          const adminMessage = document.createElement('div');
          
          adminMessage.className = 'admin-message';
          adminMessage.innerHTML = `
            <h3>Admin Account Notice</h3>
            <p>The Admin account password cannot be reset through this interface.</p>
            <p>Admin credentials:</p>
            <div class="admin-credentials">
              <div><strong>Username:</strong> admin@example.com</div>
              <div><strong>Password:</strong> Admin@2023Pass</div>
            </div>
            <button class="auth-btn" onclick="window.location.href='/login'">Return to Login</button>
          `;
          
          form.style.display = 'none';
          tokenSection.style.display = 'none';
          
          // Append the admin message to auth-box
          document.querySelector('.auth-box').appendChild(adminMessage);
          
          return;
        }
        
        // Regular user flow - show token section
        const tokenSection = document.getElementById('reset-token-section');
        const tokenDisplay = document.getElementById('reset-token-display');
        const form = document.getElementById('forgot-password-form');
        
        tokenDisplay.innerText = data.resetToken;
        form.style.display = 'none';
        tokenSection.style.display = 'block';
        
        showToast('Reset instructions sent! Check your email.', 'success');
      } else {
        showToast(data.error || 'Failed to send reset instructions', 'error');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      showToast('Something went wrong. Please try again.', 'error');
    }
  });
}

// Handle reset password form submission
if (currentForm && currentPath === '/reset-password') {
  currentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const resetToken = document.getElementById('resetToken').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Simple validation
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resetToken, newPassword })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showToast('Password reset successful! Redirecting to login...', 'success');
        
        // Redirect to login after a brief delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        showToast(data.error || 'Password reset failed', 'error');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      showToast('Something went wrong. Please try again.', 'error');
    }
  });
}

// Update the index.html page JavaScript to check for authentication
if (currentPath === '/') {
  // Check if user is logged in
  document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    
    // Optional: Verify token with the backend
    // For simplicity, we're just checking if it exists
    if (!token) {
      // Redirect to login if not authenticated
      window.location.href = '/login';
    }
  });
}

// Generate a valid password
function generatePassword() {
  // Define character sets
  const upperCaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed confusing chars I,O
  const lowerCaseChars = 'abcdefghijkmnopqrstuvwxyz'; // Removed confusing chars l
  const numberChars = '23456789'; // Removed confusing chars 0,1
  const specialChars = '@$!%*?&';
  
  // Generate a random character from a character set
  const getRandomChar = (charSet) => charSet.charAt(Math.floor(Math.random() * charSet.length));
  
  // Ensure we have at least one of each required character type
  let password = '';
  password += getRandomChar(upperCaseChars);
  password += getRandomChar(lowerCaseChars);
  password += getRandomChar(numberChars);
  password += getRandomChar(specialChars);
  
  // Add more random characters to reach the minimum length (8)
  const allChars = upperCaseChars + lowerCaseChars + numberChars + specialChars;
  while (password.length < 10) { // Generate a 10-char password
    password += getRandomChar(allChars);
  }
  
  // Shuffle the password characters
  password = password.split('').sort(() => 0.5 - Math.random()).join('');
  
  // Set the password value
  const passwordField = document.getElementById('password');
  const confirmPasswordField = document.getElementById('confirmPassword');
  
  passwordField.value = password;
  if (confirmPasswordField) {
    confirmPasswordField.value = password;
  }
  
  // Convert password fields to text temporarily to show the generated password
  passwordField.type = 'text';
  if (confirmPasswordField) {
    confirmPasswordField.type = 'text';
  }
  
  // Update toggle icons
  const toggleIcons = document.querySelectorAll('.password-toggle i');
  toggleIcons.forEach(icon => {
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  });
  
  // Show success message
  showToast('Password generated successfully!', 'success');
}