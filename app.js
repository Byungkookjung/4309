// Application state
let todos = [];
let currentFilter = 'all';

// DOM elements
const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const taskCount = document.getElementById('taskCount');
const clearCompletedBtn = document.getElementById('clearCompleted');
const emptyState = document.getElementById('emptyState');
const filterBtns = document.querySelectorAll('.filter-btn');

// Load todos from localStorage
function loadTodos() {
    const storedTodos = localStorage.getItem('todos');
    if (storedTodos) {
        todos = JSON.parse(storedTodos);
    }
    renderTodos();
}

// Save todos to localStorage
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// Add new todo
function addTodo() {
    const text = todoInput.value.trim();
    if (text === '') {
        return;
    }

    const newTodo = {
        id: Date.now(),
        text: text,
        completed: false,
        createdAt: new Date().toISOString()
    };

    todos.push(newTodo);
    todoInput.value = '';
    saveTodos();
    renderTodos();
}

// Delete todo
function deleteTodo(id) {
    todos = todos.filter(todo => todo.id !== id);
    saveTodos();
    renderTodos();
}

// Toggle todo completion
function toggleTodo(id) {
    todos = todos.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    saveTodos();
    renderTodos();
}

// Edit todo
function editTodo(id, newText) {
    if (newText.trim() === '') {
        return;
    }
    todos = todos.map(todo => 
        todo.id === id ? { ...todo, text: newText.trim() } : todo
    );
    saveTodos();
    renderTodos();
}

// Clear completed todos
function clearCompleted() {
    todos = todos.filter(todo => !todo.completed);
    saveTodos();
    renderTodos();
}

// Filter todos
function filterTodos(filter) {
    currentFilter = filter;
    
    // Update active filter button
    filterBtns.forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    renderTodos();
}

// Get filtered todos
function getFilteredTodos() {
    switch (currentFilter) {
        case 'active':
            return todos.filter(todo => !todo.completed);
        case 'completed':
            return todos.filter(todo => todo.completed);
        default:
            return todos;
    }
}

// Render todos
function renderTodos() {
    const filteredTodos = getFilteredTodos();
    
    // Update task count
    const activeCount = todos.filter(todo => !todo.completed).length;
    taskCount.textContent = `${activeCount} ${activeCount === 1 ? 'task' : 'tasks'} remaining`;
    
    // Show/hide empty state
    if (filteredTodos.length === 0) {
        emptyState.classList.remove('hidden');
        todoList.style.display = 'none';
    } else {
        emptyState.classList.add('hidden');
        todoList.style.display = 'block';
    }
    
    // Clear list
    todoList.innerHTML = '';
    
    // Render todos
    filteredTodos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.dataset.id = todo.id;
        
        li.innerHTML = `
            <input 
                type="checkbox" 
                class="todo-checkbox" 
                ${todo.completed ? 'checked' : ''}
            >
            <span class="todo-text">${escapeHtml(todo.text)}</span>
            <input 
                type="text" 
                class="edit-input" 
                value="${escapeHtml(todo.text)}"
            >
            <div class="todo-actions">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;
        
        todoList.appendChild(li);
        
        // Add event listeners
        const checkbox = li.querySelector('.todo-checkbox');
        const editBtn = li.querySelector('.edit-btn');
        const deleteBtn = li.querySelector('.delete-btn');
        const todoText = li.querySelector('.todo-text');
        const editInput = li.querySelector('.edit-input');
        
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        
        deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
        
        editBtn.addEventListener('click', () => {
            if (li.classList.contains('editing')) {
                // Save edit
                editTodo(todo.id, editInput.value);
                li.classList.remove('editing');
            } else {
                // Enter edit mode
                li.classList.add('editing');
                editInput.focus();
                editInput.select();
            }
        });
        
        editInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                editTodo(todo.id, editInput.value);
                li.classList.remove('editing');
            } else if (e.key === 'Escape') {
                editInput.value = todo.text;
                li.classList.remove('editing');
            }
        });
        
        editInput.addEventListener('blur', () => {
            editTodo(todo.id, editInput.value);
            li.classList.remove('editing');
        });
        
        // Double click to edit
        todoText.addEventListener('dblclick', () => {
            li.classList.add('editing');
            editInput.focus();
            editInput.select();
        });
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

clearCompletedBtn.addEventListener('click', clearCompleted);

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterTodos(btn.dataset.filter);
    });
});

// Initialize app
loadTodos();

