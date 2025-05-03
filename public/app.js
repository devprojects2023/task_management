// Add authentication check and user info display at the top
document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  const userString = localStorage.getItem('user');
  
  // Handle logo loading error
  const navbarLogo = document.getElementById('navbar-logo');
  if(navbarLogo) {
    navbarLogo.onerror = function() {
      this.style.display = 'none';
      const logoContainer = document.querySelector('.navbar-logo-container');
      if(logoContainer) {
        logoContainer.innerHTML = '<span class="logo-placeholder">Please upload logo.png</span>';
      }
    };
  }
  
  // Update the user profile section in the navigation bar
  updateUserProfileSection(token, userString);
  
  if (!token) {
    // Show login/register buttons in sidebar for non-logged in users
    const sidebar = document.querySelector('.sidebar');
    const authButtons = document.createElement('div');
    authButtons.className = 'auth-buttons';
    authButtons.innerHTML = `
      <div class="sidebar-header">
        <i class="fas fa-hand-sparkles"></i>
        <h3>Welcome</h3>
      </div>
      <div class="guest-info">
        <div class="guest-icon">
          <i class="fas fa-user-shield"></i>
        </div>
        <p>Guest User</p>
      </div>
    `;
    sidebar.insertBefore(authButtons, sidebar.firstChild);
    
    // Enable task controls for guests
    const taskBox = document.querySelector('.task-box');
    if (taskBox) {
      const taskInput = document.getElementById('task');
      const addButton = document.querySelector('.add-btn');
      const deleteButton = document.querySelector('.delete-btn');
      
      taskInput.disabled = false;
      taskInput.placeholder = "Add a public task...";
      addButton.disabled = false;
      
      // Instead of fully disabling the button, keep it enabled but with visual cue
      deleteButton.classList.add('disabled-btn');
      deleteButton.style.opacity = '0.7';
      deleteButton.style.cursor = 'not-allowed';
      // We'll use the click handler in deleteSelectedTasks to show the warning
      
      // Remove guest login prompt in tasks container
      const tasksContainer = document.getElementById('tasks');
      tasksContainer.innerHTML = '';
    }
    
    // Guests can add tasks, so don't return here
  }
  
  // Display user info if logged in
  if (userString) {
    try {
      // Do not show any status bar or sidebar user info for logged-in users
    } catch (error) {
      console.error('Error parsing user info:', error);
    }
  }
  
  // After checking authentication, load tasks
  loadTasks();
  
  setupProfileDropdown();
  handleWindowResize();
  
  // Add window resize listener
  window.addEventListener('resize', handleWindowResize);
});

// Function to update the user profile section in the navigation bar and sidebar
function updateUserProfileSection(token, userString) {
  // Sidebar auth section
  const sidebarAuthSection = document.getElementById('sidebar-auth-section');
  if (sidebarAuthSection) {
    const guestLinks = sidebarAuthSection.querySelector('.guest-links');
    const userDropdown = sidebarAuthSection.querySelector('.user-profile-dropdown');
    if (!token || !userString) {
      if (guestLinks) guestLinks.style.display = 'flex';
      if (userDropdown) userDropdown.style.display = 'none';
      document.body.classList.remove('logged-in'); // Remove class if not logged in
      return;
    }
    try {
      const user = JSON.parse(userString);
      if (guestLinks) guestLinks.style.display = 'none';
      if (userDropdown) {
        userDropdown.style.display = 'block';
        // Update user info
        const userName = userDropdown.querySelector('.user-name');
        const userFullName = userDropdown.querySelector('.user-full-name');
        const userEmail = userDropdown.querySelector('.user-email');
        const displayName = user.username || user.email.split('@')[0];
        if (userName) userName.textContent = displayName;
        if (userFullName) userFullName.textContent = displayName;
        if (userEmail) userEmail.textContent = user.email;
        // Show admin badge if user is admin
        if (user.isAdmin) {
          const userAvatar = userDropdown.querySelector('.user-avatar');
          if (userAvatar) {
            userAvatar.innerHTML = '<i class="fas fa-shield-alt"></i>';
            userAvatar.classList.add('admin-avatar');
          }
        }
        // Dropdown menu logic for sidebar
        const profileMenu = userDropdown.querySelector('.profile-dropdown-menu');
        const profileBtn = userDropdown.querySelector('.profile-dropdown-btn');
        // Remove any existing inline logout button
        const oldLogoutBtn = profileBtn ? profileBtn.querySelector('.logout-btn.inline-logout') : null;
        if (oldLogoutBtn) oldLogoutBtn.remove();
        // Add logout icon inside profile dropdown button, right after chevron
        if (profileBtn && !profileBtn.querySelector('.logout-btn.inline-logout')) {
          const logoutBtn = document.createElement('button');
          logoutBtn.className = 'logout-btn inline-logout';
          logoutBtn.style.background = 'none';
          logoutBtn.style.border = 'none';
          logoutBtn.style.margin = '0 0 0 8px';
          logoutBtn.style.padding = '0';
          logoutBtn.style.fontSize = '1rem';
          logoutBtn.style.display = 'inline-flex';
          logoutBtn.style.alignItems = 'center';
          logoutBtn.title = 'Logout';
          logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt" style="font-size:1.1em;"></i>';
          logoutBtn.onclick = logout;
          // Insert after chevron icon
          const chevron = profileBtn.querySelector('.fa-chevron-down');
          if (chevron && chevron.nextSibling) {
            profileBtn.insertBefore(logoutBtn, chevron.nextSibling);
          } else {
            profileBtn.appendChild(logoutBtn);
          }
        }
        // Remove any logout button below the dropdown menu
        const belowLogoutBtn = Array.from(userDropdown.querySelectorAll('.logout-btn')).find(btn => !btn.classList.contains('inline-logout'));
        if (belowLogoutBtn) belowLogoutBtn.remove();
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
    document.body.classList.add('logged-in'); // Add class if logged in
    return;
  }
  
  // Header user profile section
  const profileSection = document.getElementById('user-profile-section');
  if (!profileSection) return; // Safety check
  
  const guestLinks = profileSection.querySelector('.guest-links');
  const userDropdown = profileSection.querySelector('.user-profile-dropdown');
  
  if (!token || !userString) {
    // Not logged in, show guest links
    if (guestLinks) guestLinks.style.display = 'flex';
    if (userDropdown) userDropdown.style.display = 'none';
    return;
  }
  
  try {
    const user = JSON.parse(userString);
    
    // Hide guest links, show user dropdown
    if (guestLinks) guestLinks.style.display = 'none';
    if (userDropdown) {
      userDropdown.style.display = 'block';
      
      // Update user information
      const userName = userDropdown.querySelector('.user-name');
      const userFullName = userDropdown.querySelector('.user-full-name');
      const userEmail = userDropdown.querySelector('.user-email');
      
      // Username display logic - use email if no username
      const displayName = user.username || user.email.split('@')[0];
      
      if (userName) userName.textContent = displayName;
      if (userFullName) userFullName.textContent = displayName;
      if (userEmail) userEmail.textContent = user.email;
      
      // Show admin badge if user is admin
      if (user.isAdmin) {
        const userAvatar = userDropdown.querySelector('.user-avatar');
        if (userAvatar) {
          userAvatar.innerHTML = '<i class="fas fa-shield-alt"></i>';
          userAvatar.classList.add('admin-avatar');
        }
      }
      
      // Ensure dropdown menu is active when clicked
      const profileMenu = document.getElementById('profileMenu');
      const profileBtn = userDropdown.querySelector('.profile-dropdown-btn');
      
      if (profileBtn && profileMenu) {
        profileBtn.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          profileMenu.classList.toggle('active');
        };
      }
    }
  } catch (error) {
    console.error('Error updating user profile:', error);
  }
}

// Function to toggle the profile dropdown menu
function toggleProfileMenu() {
  const profileMenu = document.getElementById('profileMenu');
  if (profileMenu) {
    profileMenu.classList.toggle('active');
  }
}

// Add logout function
function logout() {
  console.log('Logout function called');
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showToast('Logged out successfully', 'success');
  document.body.classList.remove('logged-in'); // Remove class on logout
  // Reload page after logout
  setTimeout(() => {
    window.location.href = '/';
  }, 1000);
}

// Ensure the window event listener for clicking outside is correct
window.addEventListener('click', function(e) {
  const profileMenu = document.getElementById('profileMenu');
  if (!profileMenu) return;
  
  if (profileMenu.classList.contains('active') && 
      !e.target.closest('.profile-dropdown-menu') && 
      !e.target.closest('.profile-dropdown-btn')) {
    profileMenu.classList.remove('active');
  }
});

// Global sort state variables
let currentSortOrder = 'newest'; // 'newest', 'oldest'
let currentSortField = 'timestamp'; // 'timestamp', 'priority'
let allTasks = []; // Store all fetched tasks
const TASKS_PER_PAGE = 5; // Number of tasks per page
let currentPage = 1;

// Function to truncate text and add "read more" button
function truncateText(text, maxLength = 80) {
  if (!text || text.length <= maxLength) return text;
  
  const truncated = text.substr(0, maxLength);
  return `
    <div class="truncated-text">
      <span class="truncated-content">${truncated}...</span>
      <span class="full-content" style="display:none">${text}</span>
      <button class="read-more-btn" onclick="toggleReadMore(this, event)">Read More</button>
    </div>
  `;
}

// Function to toggle read more/less
function toggleReadMore(button, event) {
  event.stopPropagation(); // Prevent task selection toggle
  
  const container = button.closest('.truncated-text');
  const truncated = container.querySelector('.truncated-content');
  const full = container.querySelector('.full-content');
  
  if (truncated.style.display !== 'none') {
    truncated.style.display = 'none';
    full.style.display = 'inline';
    button.textContent = 'Read Less';
  } else {
    truncated.style.display = 'inline';
    full.style.display = 'none';
    button.textContent = 'Read More';
  }
}

// YouTube player variables
let player0, player1, player2;

// Initialize YouTube API
function onYouTubeIframeAPIReady() {
  // Create players with explicit IDs
  player0 = new YT.Player('youtube-player-0', {
    height: '100%',
    width: '100%',
    videoId: 'Xrgk023l4lI',
    playerVars: {
      'autoplay': 0,
      'mute': 1,
      'controls': 1,
      'rel': 0,
      'modestbranding': 1
    },
    events: {
      'onReady': onPlayerReady0
    }
  });
  
  player1 = new YT.Player('youtube-player-1', {
    height: '100%',
    width: '100%',
    videoId: '4SfsZhRCUVs',
    playerVars: {
      'autoplay': 0,
      'mute': 1,
      'controls': 1,
      'rel': 0,
      'modestbranding': 1
    },
    events: {
      'onReady': onPlayerReady1
    }
  });
  
  player2 = new YT.Player('youtube-player-2', {
    height: '100%',
    width: '100%',
    videoId: 'sQeK9BjkRG8',
    playerVars: {
      'autoplay': 0,
      'mute': 1,
      'controls': 1,
      'rel': 0,
      'modestbranding': 1
    },
    events: {
      'onReady': onPlayerReady2
    }
  });
}

// Player ready handlers with staggered autoplay
function onPlayerReady0(event) {
  setTimeout(() => {
    event.target.playVideo();
  }, 500);
}

function onPlayerReady1(event) {
  setTimeout(() => {
    event.target.playVideo();
  }, 2000);
}

function onPlayerReady2(event) {
  setTimeout(() => {
    event.target.playVideo();
  }, 3500);
}

// Show toast notification
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toast-container');
  // Remove all existing toasts before showing a new one
  while (toastContainer.firstChild) {
    toastContainer.removeChild(toastContainer.firstChild);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'exclamation-circle';
  if (type === 'warning') icon = 'exclamation-triangle';
  toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
  toastContainer.appendChild(toast);
  const duration = type === 'warning' ? 5000 : 3000;
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toastContainer.contains(toast)) {
        toastContainer.removeChild(toast);
      }
    }, 300);
  }, duration);
}

// Add task function implementation
async function addTask() {
  const taskInput = document.getElementById('task');
  const taskTitle = taskInput.value.trim();
  const addTaskBtn = document.querySelector('.add-btn');

  if (!taskTitle) {
    showToast('Please enter a task title', 'warning');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const isLoggedIn = !!token;
    const url = isLoggedIn ? '/api/tasks' : '/api/public-tasks';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (isLoggedIn) headers['Authorization'] = `Bearer ${token}`;

    // Show loading indicator
    const originalBtnContent = addTaskBtn.innerHTML;
    addTaskBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    addTaskBtn.disabled = true;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: taskTitle }),
    });

    // Restore button
    addTaskBtn.innerHTML = originalBtnContent;
    addTaskBtn.disabled = false;

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      showToast(error.error || error.msg || 'Error adding task', 'error');
      return;
    }

    taskInput.value = '';
    showToast('Task added successfully!', 'success');
    loadTasks();
    taskInput.blur();
  } catch (error) {
    console.error('Error adding task:', error);
    addTaskBtn.innerHTML = originalBtnContent;
    addTaskBtn.disabled = false;
    showToast('Network error. Please try again.', 'error');
  }
}

// Function to show and focus on search box
function showSearchBox() {
  const input = document.getElementById('sidebar-search-input');
  if (input) {
    input.focus();
    console.log('Search box focused');
  }
}

// Event listeners for search functionality
document.addEventListener('DOMContentLoaded', function() {
  // Create the hidden search input first
  setupHiddenSearchInput();
  
  // Initialize search functionality
  initializeSearchFunctionality();
  
  // Load tasks on page load
  loadTasks();
  
  // Other initialization code...
});

// Function to initialize all search-related functionality
function initializeSearchFunctionality() {
  console.log('Initializing search functionality');
  
  // 1. Set up search button event listener
  const searchBtn = document.querySelector('.search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', function(e) {
      e.preventDefault(); // Prevent default form submission
      console.log('Search button clicked');
      sidebarSearch();
    });
  }
  
  // 2. Set up sidebar search input event listeners
  const sidebarSearchInput = document.getElementById('sidebar-search-input');
  if (sidebarSearchInput) {
    // Enter key for search
    sidebarSearchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission
        console.log('Enter key pressed in search input');
        sidebarSearch();
      }
    });
    
    // Input change for clearing search
    sidebarSearchInput.addEventListener('input', function() {
      if (this.value.trim() === '') {
        console.log('Search input cleared, resetting results');
        clearSearch();
      }
    });
  }
}

// Function to handle sidebar search with error handling
function sidebarSearch() {
  try {
    console.log('Sidebar search initiated');
    
    // Get search text from visible input
    const searchInputElement = document.getElementById('sidebar-search-input');
    if (!searchInputElement) {
      console.error('Search input element not found');
      showToast('Search functionality unavailable', 'error');
      return;
    }
    
    const searchText = searchInputElement.value.trim();
    console.log(`Search text: "${searchText}"`);
    
    // Ensure hidden input exists and update its value
    if (!document.getElementById('search')) {
      setupHiddenSearchInput();
    }
    
    const hiddenSearchInput = document.getElementById('search');
    if (hiddenSearchInput) {
      hiddenSearchInput.value = searchText;
    } else {
      console.error('Failed to create hidden search input');
      // Continue anyway using the visible input value
    }
    
    // If search text is empty, just load all tasks
    if (!searchText) {
      console.log('Empty search, loading all tasks');
      loadTasks();
      return;
    }
    
    // Show a loading indicator immediately
    const tasksContainer = document.getElementById('tasks');
    if (tasksContainer) {
      tasksContainer.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Searching tasks...</div>';
    }
    
    // Execute the search with a slight delay to allow UI update
    setTimeout(() => {
      searchTask(searchText);
    }, 50);
  } catch (error) {
    console.error('Error in sidebar search:', error);
    showToast('Search error: ' + (error.message || 'Unknown error'), 'error');
  }
}

// Function to perform the actual search
async function searchTask(searchText) {
  // If searchText not provided, get it from the hidden input
  if (!searchText) {
    const searchInput = document.getElementById('search');
    searchText = searchInput ? searchInput.value.trim() : '';
  }
  
  console.log(`Executing search for: "${searchText}"`);
  
  try {
    // Show loading indicator if not already shown
    const taskContainer = document.getElementById('tasks');
    if (taskContainer && !taskContainer.querySelector('.loading-indicator')) {
      taskContainer.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Searching tasks...</div>';
    }
    
    // Fetch tasks with the search query
    const tasks = await fetchTasks(searchText);
    
    // Store tasks for pagination and update the UI
    allTasks = tasks;
    currentPage = 1;
    displayTasks(tasks, currentPage);
    
    // Show user feedback based on results
    if (tasks.length === 0) {
      showToast(`No tasks found matching "${searchText}"`, 'info');
    } else {
      showToast(`Found ${tasks.length} tasks matching "${searchText}"`, 'success');
    }
  } catch (error) {
    console.error('Search error:', error);
    
    // Show error in the tasks container
    const taskContainer = document.getElementById('tasks');
    if (taskContainer) {
      taskContainer.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error searching tasks</p>
          <p class="error-details">${error.message || 'Unknown error'}</p>
          <button onclick="loadTasks()" class="retry-btn">Show All Tasks</button>
        </div>
      `;
    }
    
    // Show toast notification
    showToast('Error searching tasks. ' + (error.message || ''), 'error');
  }
}

// Function to create the hidden search input
function setupHiddenSearchInput() {
  if (!document.getElementById('search')) {
    console.log('Creating hidden search input');
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = 'search';
    document.body.appendChild(hiddenInput);
    return true;
  }
  return false;
}

// Improve the clear search function
function clearSearch() {
  console.log('Clearing search');
  
  // Clear both inputs
  const hiddenInput = document.getElementById('search');
  if (hiddenInput) {
    hiddenInput.value = '';
  }
  
  const sidebarInput = document.getElementById('sidebar-search-input');
  if (sidebarInput) {
    sidebarInput.value = '';
  }
  
  // Load all tasks
  loadTasks();
  
  // Show feedback
  showToast('Showing all tasks', 'info');
}

// Improved fetchTasks function that handles authentication properly
async function fetchTasks(searchQuery = '') {
  console.log(`Fetching tasks with search query: "${searchQuery}"`);
  
  try {
    // Get authentication token
    const token = localStorage.getItem('token');
    const isLoggedIn = !!token;
    console.log(`User is ${isLoggedIn ? 'logged in' : 'not logged in'}`);
    
    // Construct the API URL based on authentication status
    let apiUrl;
    if (isLoggedIn) {
      apiUrl = searchQuery 
        ? `/api/tasks?q=${encodeURIComponent(searchQuery)}`
        : '/api/tasks';
    } else {
      apiUrl = searchQuery 
        ? `/api/public-tasks?q=${encodeURIComponent(searchQuery)}`
        : '/api/public-tasks';
    }
    console.log(`API URL: ${apiUrl}`);
    
    // Prepare headers with authentication if needed
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (isLoggedIn) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Make the API request
    console.log('Sending fetch request...');
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers,
      credentials: 'same-origin'  // Important for session cookies
    });
    
    console.log(`Response status: ${response.status}`);
    
    // Handle authentication errors
    if (response.status === 401 && isLoggedIn) {
      console.error('Authentication failed');
      showToast('Your session has expired. Please login again.', 'error');
      setTimeout(() => logout(), 2000);
      return [];
    }
    
    // Handle other errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText}. ${errorText}`);
    }
    
    // Parse the response
    const tasks = await response.json();
    console.log(`Received ${tasks.length} tasks from API`);
    
    // Sort tasks by timestamp (newest first)
    return tasks.sort((a, b) => new Date(b.timestamp || Date.now()) - new Date(a.timestamp || Date.now()));
    
  } catch (error) {
    console.error('Error fetching tasks:', error);
    showToast('Error loading tasks: ' + (error.message || 'Unknown error'), 'error');
    throw error; // Re-throw to handle in the calling function
  }
}

// Function to load tasks with proper loading indicators
async function loadTasks() {
  try {
    // Show loading indicator
    const tasksContainer = document.getElementById('tasks');
    if (tasksContainer) {
      tasksContainer.innerHTML = '<div class="loading-indicator"><i class="fas fa-spinner fa-spin"></i> Loading tasks...</div>';
    }
    
    // Fetch tasks with improved error handling
    const tasks = await fetchTasks();
    
    // Keep a reference to all tasks for pagination
    allTasks = tasks;
    currentPage = 1;
    
    // Display the tasks
    displayTasks(tasks, currentPage);
    
  } catch (error) {
    console.error('Error loading tasks:', error);
    
    // Show error in the tasks container
    const tasksContainer = document.getElementById('tasks');
    if (tasksContainer) {
      tasksContainer.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Failed to load tasks</p>
          <p class="error-details">${error.message || 'Unknown error'}</p>
          <button onclick="loadTasks()" class="retry-btn">Retry</button>
        </div>
      `;
    }
  }
}

function displayTasks(tasks, page = 1) {
  const taskContainer = document.getElementById('tasks');
  
  if (tasks.length === 0) {
    taskContainer.innerHTML = '<div class="no-tasks-message"><i class="fas fa-clipboard-list"></i> No tasks found. Add some tasks to get started!</div>';
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  
  // Calculate pagination
  const totalPages = Math.ceil(tasks.length / TASKS_PER_PAGE);
  const startIndex = (page - 1) * TASKS_PER_PAGE;
  const endIndex = Math.min(startIndex + TASKS_PER_PAGE, tasks.length);
  const paginatedTasks = tasks.slice(startIndex, endIndex);
  
  // Generate task HTML
  taskContainer.innerHTML = paginatedTasks.map((task, index) => {
    const date = new Date(task.timestamp || Date.now()).toLocaleString();
    const taskNumber = startIndex + index + 1;
    
    // Use truncate function for long task titles
    const taskTitle = truncateText(task.title, 60);
    
    return `
      <div class="task-item" data-id="${task._id}">
        <div class="checkbox-container">
          <input type="checkbox" id="task-${task._id}" data-id="${task._id}">
        </div>
        <div class="task-content">
          <div class="task-title">
            <span class="task-title-display">${taskNumber}. ${taskTitle}</span>
            <input type="text" class="task-title-edit" value="${task.title}">
          </div>
          <div class="task-details">
            <div class="task-timestamp"><i class="far fa-clock"></i> ${date}</div>
          </div>
        </div>
        <div class="task-actions">
          <button onclick="toggleEditMode('${task._id}')" class="edit-btn"><i class="fas fa-edit"></i> Edit</button>
          <button onclick="saveTask('${task._id}')" class="save-btn" style="display:none;"><i class="fas fa-save"></i></button>
          <button onclick="deleteTask('${task._id}')" class="delete-btn"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Generate pagination controls
  renderPagination(totalPages, page);
}

// Helper function to get priority icon
function getPriorityIcon(priority) {
  const icons = {
    'low': '<span class="priority-badge low"><i class="fas fa-arrow-down"></i> Low</span>',
    'normal': '<span class="priority-badge normal"><i class="fas fa-minus"></i> Normal</span>',
    'high': '<span class="priority-badge high"><i class="fas fa-arrow-up"></i> High</span>'
  };
  
  return icons[priority] || icons['normal'];
}

function renderPagination(totalPages, currentPage) {
  const pagination = document.getElementById('pagination');
  let paginationHTML = '';
  
  if (totalPages > 1) {
    // Previous button
    paginationHTML += `<button onclick="changePage(${Math.max(1, currentPage - 1)})" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
    
    // Page numbers - adaptive for mobile
    if (totalPages <= 5 || window.innerWidth >= 480) {
      // Show all pages if 5 or fewer, or on larger screens
      for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `<button onclick="changePage(${i})" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
      }
    } else {
      // On mobile with many pages, show limited page numbers
      let startPage = Math.max(1, currentPage - 1);
      let endPage = Math.min(totalPages, currentPage + 1);
      
      // Show first page
      if (startPage > 1) {
        paginationHTML += `<button onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
          paginationHTML += `<button disabled>...</button>`;
        }
      }
      
      // Show middle pages
      for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `<button onclick="changePage(${i})" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
      }
      
      // Show last page
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          paginationHTML += `<button disabled>...</button>`;
        }
        paginationHTML += `<button onclick="changePage(${totalPages})">${totalPages}</button>`;
      }
    }
    
    // Next button
    paginationHTML += `<button onclick="changePage(${Math.min(totalPages, currentPage + 1)})" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
  }
  
  pagination.innerHTML = paginationHTML;
}

function changePage(page) {
  currentPage = page;
  displayTasks(allTasks, currentPage);
  
  // Scroll to top of tasks container for better mobile experience
  document.getElementById('tasks').scrollIntoView({ behavior: 'smooth' });
}

function toggleEditMode(taskId) {
  const taskItem = document.querySelector(`.task-item[data-id="${taskId}"]`);
  taskItem.classList.toggle('edit-mode');
  
  const editBtn = taskItem.querySelector('.edit-btn');
  const saveBtn = taskItem.querySelector('.save-btn');
  const titleDisplay = taskItem.querySelector('.task-title-display');
  const titleEdit = taskItem.querySelector('.task-title-edit');
  
  if (taskItem.classList.contains('edit-mode')) {
    editBtn.style.display = 'none';
    saveBtn.style.display = 'flex';
    titleDisplay.style.display = 'none';
    titleEdit.style.display = 'block';
    titleEdit.focus();
    // Select all text in the input
    titleEdit.select();
  } else {
    // Exit edit mode without saving
    editBtn.style.display = 'flex';
    saveBtn.style.display = 'none';
  }
}

// Update saveTask function 
async function saveTask(taskId) {
  const taskItem = document.querySelector(`.task-item[data-id="${taskId}"]`);
  const titleInput = taskItem.querySelector('.task-title-edit');
  const titleDisplay = taskItem.querySelector('.task-title-display');
  
  if (!titleInput.value.trim()) {
    showToast('Task title cannot be empty', 'warning');
    return;
  }
  
  try {
    const token = localStorage.getItem('token');
    const saveBtn = taskItem.querySelector('.save-btn');
    const editBtn = taskItem.querySelector('.edit-btn');
    const originalBtnHTML = saveBtn.innerHTML;
    
    // Show loading indicator
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    saveBtn.disabled = true;
    
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        title: titleInput.value.trim()
      })
    });
    
    // Restore button
    saveBtn.innerHTML = originalBtnHTML;
    saveBtn.disabled = false;
    
    if (response.ok) {
      showToast('Task updated successfully', 'success');
      
      // Update the title display
      if (titleDisplay) {
        // Keep the task number
        const taskNumber = titleDisplay.textContent.split('.')[0].trim();
        titleDisplay.innerHTML = `${taskNumber}. ${titleInput.value.trim()}`;
      }
      
      // Switch back to display mode
      saveBtn.style.display = 'none';
      editBtn.style.display = 'flex';
      titleDisplay.style.display = 'block';
      titleInput.style.display = 'none';
      
      // Remove cancel button if it exists
      const cancelBtn = taskItem.querySelector('.cancel-btn');
      if (cancelBtn) {
        cancelBtn.remove();
      }
      
      // Remove edit mode class
      taskItem.classList.remove('edit-mode');
      
      // Reload tasks to ensure everything is in sync with the server
      // But maintain the current page position
      const currentViewPage = currentPage;
      await loadTasks();
      changePage(currentViewPage);
    } else {
      // Handle error
      const error = await response.json();
      showToast(error.error || 'Error updating task', 'error');
    }
  } catch (error) {
    console.error('Error updating task:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

// Update deleteSelectedTasks to include authentication
async function deleteSelectedTasks() {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
  const taskCheckboxes = Array.from(checkboxes).filter(cb => cb.id !== 'select-all');
  
  if (taskCheckboxes.length === 0) {
    showToast('Please select at least one task to delete', 'error');
    return;
  }
  
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    // Guest user trying to delete - show warning message
    showToast('Access Denied: Guests cannot delete tasks. Please log in to manage tasks.', 'warning');
    
    // Uncheck the checkboxes
    taskCheckboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    document.getElementById('select-all').checked = false;
    
    return;
  }
  
  const confirmDelete = confirm(`Are you sure you want to delete ${taskCheckboxes.length} task(s)?`);
  if (!confirmDelete) return;
  
  const taskIds = taskCheckboxes.map(checkbox => checkbox.dataset.id);
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    const res = await fetch('/api/tasks', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ ids: taskIds }),
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showToast(data.message, 'success');
      loadTasks();
      
      // Uncheck the select all checkbox
      document.getElementById('select-all').checked = false;
    } else {
      showToast(data.error || 'Error deleting tasks', 'error');
    }
  } catch (error) {
    console.error('Error deleting tasks:', error);
    showToast('Network error. Please try again.', 'error');
  }
}

// Function to handle select all checkbox
function toggleSelectAll() {
  const selectAllCheckbox = document.getElementById('select-all');
  const isChecked = selectAllCheckbox.checked;
  
  // Get all task checkboxes
  const taskCheckboxes = document.querySelectorAll('.task-item input[type="checkbox"]');
  
  // Set all checkboxes to match the select all checkbox
  taskCheckboxes.forEach(checkbox => {
    checkbox.checked = isChecked;
  });
}

// Event delegation for task checkboxes
document.addEventListener('change', function(event) {
  if (event.target.type === 'checkbox' && event.target.closest('.task-item')) {
    updateSelectAllCheckbox();
  }
});

// Update select all checkbox state based on individual task checkboxes
function updateSelectAllCheckbox() {
  const selectAllCheckbox = document.getElementById('select-all');
  const taskCheckboxes = document.querySelectorAll('.task-item input[type="checkbox"]');
  
  if (taskCheckboxes.length === 0) {
    selectAllCheckbox.checked = false;
    return;
  }
  
  // Check if all task checkboxes are checked
  const allChecked = Array.from(taskCheckboxes).every(checkbox => checkbox.checked);
  selectAllCheckbox.checked = allChecked;
}

// Handle enter key press in input fields
document.addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    const activeElement = document.activeElement;
    
    if (activeElement.id === 'task') {
      addTask();
    } else if (activeElement.id === 'search') {
      searchTask();
    } else if (activeElement.classList.contains('task-title-edit')) {
      const taskId = activeElement.closest('.task-item').dataset.id;
      saveTask(taskId);
    }
  }
});

// Handle window resize for pagination
window.addEventListener('resize', function() {
  if (allTasks.length > 0) {
    displayTasks(allTasks, currentPage);
  }
});

// Add user info styles
const userInfoStyle = document.createElement('style');
userInfoStyle.textContent = `
  .user-info {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 10px 0;
    margin-bottom: 15px;
    font-size: 0.9rem;
    color: #2c3e50;
  }
  
  .user-info span {
    margin-right: 15px;
  }
  
  .admin-badge {
    background-color: #f39c12;
    color: white;
    padding: 5px 10px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: bold;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  
  .admin-badge i {
    font-size: 0.9rem;
  }
  
  .logout-btn {
    background-color: #e74c3c;
    color: white;
    border: none;
    border-radius: 5px;
    padding: 5px 10px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s;
  }
  
  .logout-btn:hover {
    background-color: #c0392b;
  }
  #toast-container {
    position: fixed;
    top: 70px;
    right: 20px;
    z-index: 9999;
    min-width: 250px;
  }
  .toast.warning {
    background-color: #d32f2f;
    color: #fff;
    border-left: 6px solid #b71c1c;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(211,47,47,0.15);
  }
`;
document.head.appendChild(userInfoStyle);

function renderLoginForm() {
  const template = `
    <div class="form-container">
      <h2>Login</h2>
      <form id="login-form">
        <div class="form-group">
          <label for="email">Email or Username</label>
          <input type="text" id="email" name="email" required>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required>
        </div>
        <button type="submit" class="btn">Login</button>
      </form>
      <p><a href="#" id="forgot-password-link">Forgot Password?</a></p>
      <p>Don't have an account? <a href="#" id="register-link">Register</a></p>
    </div>
  `;
  
  document.getElementById('app').innerHTML = template;
  
  // Setup event listeners
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-link').addEventListener('click', renderRegisterForm);
  document.getElementById('forgot-password-link').addEventListener('click', renderForgotPasswordForm);
}

// Add window event listener to close profile dropdown when clicking outside
window.addEventListener('click', function(e) {
  const profileMenu = document.getElementById('profileMenu');
  const profileBtn = document.querySelector('.profile-dropdown-btn');
  
  if (profileMenu && profileMenu.classList.contains('active') && 
      !e.target.closest('.profile-dropdown-menu') && 
      e.target !== profileBtn && 
      !profileBtn.contains(e.target)) {
    profileMenu.classList.remove('active');
  }
});

// Delete a single task
async function deleteTask(taskId) {
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    showToast('Access Denied: Please log in to delete tasks.', 'warning');
    return false;
  }
  
  if (!confirm('Are you sure you want to delete this task?')) {
    return false;
  }
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers
    });
    
    if (res.ok) {
      showToast('Task deleted successfully', 'success');
      loadTasks(); // Refresh the task list
      return true;
    } else {
      const data = await res.json();
      showToast(data.error || 'Error deleting task', 'error');
      return false;
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    showToast('Network error. Please try again.', 'error');
    return false;
  }
}

