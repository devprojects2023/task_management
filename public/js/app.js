// DOM elements
const taskForm = document.querySelector('#taskForm');
const taskInput = document.querySelector('#taskInput');
const taskList = document.querySelector('#taskList');
const logoutBtn = document.querySelector('#logout');
const errorMsg = document.querySelector('#errorMsg');
const loadingIndicator = document.querySelector('#loadingIndicator');

// Token handling
function getToken() {
  return localStorage.getItem('token');
}

function clearToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// API calls
async function getTasks() {
  showLoading(true);
  try {
    const token = getToken();
    const response = await fetch('/api/tasks', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 401) {
      handleUnauthorized();
      return [];
    }
    
    if (!response.ok) {
      throw new Error('Failed to fetch tasks');
    }
    
    return await response.json();
  } catch (error) {
    showError('Failed to load tasks. Please try again later.');
    console.error(error);
    return [];
  } finally {
    showLoading(false);
  }
}

async function addTask(title) {
  showLoading(true);
  try {
    const token = getToken();
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title })
    });
    
    if (response.status === 401) {
      handleUnauthorized();
      return null;
    }
    
    if (!response.ok) {
      throw new Error('Failed to add task');
    }
    
    return await response.json();
  } catch (error) {
    showError('Failed to add task. Please try again later.');
    console.error(error);
    return null;
  } finally {
    showLoading(false);
  }
}

async function deleteTask(id) {
  showLoading(true);
  try {
    const token = getToken();
    const response = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 401) {
      handleUnauthorized();
      return false;
    }
    
    if (!response.ok) {
      throw new Error('Failed to delete task');
    }
    
    return true;
  } catch (error) {
    showError('Failed to delete task. Please try again later.');
    console.error(error);
    return false;
  } finally {
    showLoading(false);
  }
}

async function toggleTaskCompletion(id) {
  showLoading(true);
  try {
    const token = getToken();
    const response = await fetch(`/api/tasks/${id}/toggle`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 401) {
      handleUnauthorized();
      return null;
    }
    
    if (!response.ok) {
      throw new Error('Failed to update task');
    }
    
    return await response.json();
  } catch (error) {
    showError('Failed to update task. Please try again later.');
    console.error(error);
    return null;
  } finally {
    showLoading(false);
  }
}

// UI functions
function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = 'task-item';
  li.dataset.id = task._id;
  
  if (task.completed) {
    li.classList.add('completed');
  }

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox';
  checkbox.checked = task.completed;
  
  const span = document.createElement('span');
  span.className = 'task-title';
  span.textContent = task.title;
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.innerHTML = '&times;';
  
  // Event listeners
  checkbox.addEventListener('change', async () => {
    const updatedTask = await toggleTaskCompletion(task._id);
    if (updatedTask) {
      li.classList.toggle('completed', updatedTask.completed);
    }
  });
  
  deleteBtn.addEventListener('click', async () => {
    const success = await deleteTask(task._id);
    if (success) {
      li.remove();
    }
  });
  
  li.appendChild(checkbox);
  li.appendChild(span);
  li.appendChild(deleteBtn);
  
  return li;
}

function renderTasks(tasks) {
  taskList.innerHTML = '';
  if (tasks.length === 0) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = 'No tasks found. Create a new task!';
    taskList.appendChild(emptyMessage);
  } else {
    tasks.forEach(task => {
      taskList.appendChild(createTaskElement(task));
    });
  }
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.style.display = 'block';
  setTimeout(() => {
    errorMsg.style.display = 'none';
  }, 3000);
}

function showLoading(isLoading) {
  loadingIndicator.style.display = isLoading ? 'block' : 'none';
}

function handleUnauthorized() {
  clearToken();
  window.location.href = '/login.html';
}

// Event listeners
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const title = taskInput.value.trim();
  if (!title) {
    showError('Task title cannot be empty');
    return;
  }
  
  const task = await addTask(title);
  if (task) {
    taskInput.value = '';
    
    // Remove the empty message if it exists
    const emptyMessage = taskList.querySelector('.empty-message');
    if (emptyMessage) {
      emptyMessage.remove();
    }
    
    taskList.insertBefore(createTaskElement(task), taskList.firstChild);
  }
});

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    clearToken();
    window.location.href = '/login.html';
  });
}

// Initialize
async function init() {
  // Check if user is logged in
  if (!getToken()) {
    window.location.href = '/login.html';
    return;
  }
  
  const tasks = await getTasks();
  renderTasks(tasks);
}

document.addEventListener('DOMContentLoaded', init); 