// Application state
let todos = [];
let currentFilter = 'all';
let currentView = 'list'; // 'list' or 'calendar'
let currentDate = new Date();
let selectedDate = null; // For filtering by specific date
let expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
let editExpenseIndex = null;

// DOM elements
const todoInput = document.getElementById('todoInput');
const todoDateInput = document.getElementById('todoDate');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const taskCount = document.getElementById('taskCount');
const clearCompletedBtn = document.getElementById('clearCompleted');
const emptyState = document.getElementById('emptyState');
const filterBtns = document.querySelectorAll('.filter-btn');
const listViewBtn = document.getElementById('listViewBtn');
const calendarViewBtn = document.getElementById('calendarViewBtn');
const calendarSection = document.getElementById('calendarSection');
const listSection = document.getElementById('listSection');
const calendar = document.getElementById('calendar');
const currentMonthElement = document.getElementById('currentMonth');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const selectedDateInfo = document.getElementById('selectedDateInfo');
const selectedDateText = document.getElementById('selectedDateText');
const clearDateFilterBtn = document.getElementById('clearDateFilter');
const accountBookBtn = document.getElementById('accountBookBtn');
const accountBookSection = document.getElementById('accountBookSection');
const expenseForm = document.getElementById('expenseForm');
const expenseList = document.getElementById('expenseList');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const newCategoryInput = document.getElementById('newCategory');
const categorySelect = document.getElementById('category');
const showCategoryInputBtn = document.getElementById('showCategoryInputBtn');
const categoryInputWrapper = document.getElementById('categoryInputWrapper');

// Load todos from localStorage
function loadTodos() {
    const storedTodos = localStorage.getItem('todos');
    if (storedTodos) {
        todos = JSON.parse(storedTodos);
    }
    renderTodos();
    renderCalendar();
}

// Save todos to localStorage
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Format date for input (YYYY-MM-DD)
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Check if date is today
function isToday(dateString) {
    if (!dateString) return false;
    const today = new Date();
    const date = new Date(dateString);
    return date.toDateString() === today.toDateString();
}

// Check if date is in the future
function isUpcoming(dateString) {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    return date > today;
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
        createdAt: new Date().toISOString(),
        dueDate: todoDateInput.value || null
    };

    todos.push(newTodo);
    todoInput.value = '';
    todoDateInput.value = '';
    saveTodos();
    renderTodos();
    renderCalendar();
}

// Delete todo
function deleteTodo(id) {
    todos = todos.filter(todo => todo.id !== id);
    saveTodos();
    renderTodos();
    renderCalendar();
}

// Toggle todo completion
function toggleTodo(id) {
    todos = todos.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    saveTodos();
    renderTodos();
    renderCalendar();
}

// Edit todo
function editTodo(id, newText, newDate = null) {
    if (newText.trim() === '') {
        return;
    }
    todos = todos.map(todo => {
        if (todo.id === id) {
            const updated = { ...todo, text: newText.trim() };
            if (newDate !== undefined) {
                updated.dueDate = newDate || null;
            }
            return updated;
        }
        return todo;
    });
    saveTodos();
    renderTodos();
    renderCalendar();
}

// Clear completed todos
function clearCompleted() {
    todos = todos.filter(todo => !todo.completed);
    saveTodos();
    renderTodos();
    renderCalendar();
}

// Filter todos
function filterTodos(filter) {
    currentFilter = filter;
    selectedDate = null;
    selectedDateInfo.classList.add('hidden');
    
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
    let filtered = todos;
    
    // Apply date filter if selected
    if (selectedDate) {
        const selectedDateStr = formatDateForInput(selectedDate);
        filtered = filtered.filter(todo => todo.dueDate === selectedDateStr);
    } else {
        // Apply status filter
        switch (currentFilter) {
            case 'active':
                filtered = filtered.filter(todo => !todo.completed);
                break;
            case 'completed':
                filtered = filtered.filter(todo => todo.completed);
                break;
            case 'today':
                filtered = filtered.filter(todo => todo.dueDate && isToday(todo.dueDate));
                break;
            case 'upcoming':
                filtered = filtered.filter(todo => todo.dueDate && isUpcoming(todo.dueDate));
                break;
        }
    }
    
    // Sort by due date (todos with dates first, then by date)
    filtered.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
    });
    
    return filtered;
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
        
        const dateDisplay = todo.dueDate 
            ? `<span class="todo-date ${isToday(todo.dueDate) ? 'today' : ''}">📅 ${formatDate(todo.dueDate)}</span>` 
            : '';
        
        li.innerHTML = `
            <input 
                type="checkbox" 
                class="todo-checkbox" 
                ${todo.completed ? 'checked' : ''}
            >
            <div class="todo-content">
                <span class="todo-text">${escapeHtml(todo.text)}</span>
                ${dateDisplay}
            </div>
            <input 
                type="text" 
                class="edit-input" 
                value="${escapeHtml(todo.text)}"
            >
            <input 
                type="date" 
                class="edit-date-input" 
                value="${todo.dueDate || ''}"
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
        const editDateInput = li.querySelector('.edit-date-input');
        
        checkbox.addEventListener('change', () => toggleTodo(todo.id));
        
        deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
        
        editBtn.addEventListener('click', () => {
            if (li.classList.contains('editing')) {
                // Save edit
                editTodo(todo.id, editInput.value, editDateInput.value);
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
                editTodo(todo.id, editInput.value, editDateInput.value);
                li.classList.remove('editing');
            } else if (e.key === 'Escape') {
                editInput.value = todo.text;
                editDateInput.value = todo.dueDate || '';
                li.classList.remove('editing');
            }
        });
        
        editInput.addEventListener('blur', () => {
            if (li.classList.contains('editing')) {
                editTodo(todo.id, editInput.value, editDateInput.value);
                li.classList.remove('editing');
            }
        });
        
        // Double click to edit
        todoText.addEventListener('dblclick', () => {
            li.classList.add('editing');
            editInput.focus();
            editInput.select();
        });
    });
}

// Render calendar
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Update month header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    currentMonthElement.textContent = `${monthNames[month]} ${year}`;
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    // Clear calendar
    calendar.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
    });
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendar.appendChild(emptyCell);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        const dateStr = formatDateForInput(new Date(year, month, day));
        const dayTodos = todos.filter(todo => todo.dueDate === dateStr);
        const activeTodos = dayTodos.filter(todo => !todo.completed);
        const completedTodos = dayTodos.filter(todo => todo.completed);
        
        // Check if this is today
        const cellDate = new Date(year, month, day);
        if (cellDate.toDateString() === today.toDateString()) {
            dayCell.classList.add('today');
        }
        
        // Check if this is selected date
        if (selectedDate && cellDate.toDateString() === selectedDate.toDateString()) {
            dayCell.classList.add('selected');
        }
        
        // Add day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayCell.appendChild(dayNumber);
        
        // Add todo indicators
        if (activeTodos.length > 0) {
            const indicator = document.createElement('div');
            indicator.className = 'todo-indicator active';
            indicator.textContent = activeTodos.length;
            dayCell.appendChild(indicator);
        }
        
        if (completedTodos.length > 0) {
            const indicator = document.createElement('div');
            indicator.className = 'todo-indicator completed';
            indicator.textContent = completedTodos.length;
            dayCell.appendChild(indicator);
        }
        
        // Add click handler
        dayCell.addEventListener('click', () => {
            selectedDate = new Date(year, month, day);
            selectedDateInfo.classList.remove('hidden');
            selectedDateText.textContent = formatDate(dateStr);
            
            // Update filter buttons
            filterBtns.forEach(btn => btn.classList.remove('active'));
            
            renderTodos();
            renderCalendar();
        });
        
        calendar.appendChild(dayCell);
    }
}

// Switch view
function switchView(view) {
    currentView = view;
    
    if (view === 'calendar') {
        calendarSection.classList.remove('hidden');
        listSection.classList.add('hidden');
        calendarViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        renderCalendar();
    } else {
        calendarSection.classList.add('hidden');
        listSection.classList.remove('hidden');
        listViewBtn.classList.add('active');
        calendarViewBtn.classList.remove('active');
        renderTodos();
    }
}

// Navigate calendar months
function navigateMonth(direction) {
    if (direction === 'prev') {
        currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    renderCalendar();
}

// Clear date filter
function clearDateFilter() {
    selectedDate = null;
    selectedDateInfo.classList.add('hidden');
    renderTodos();
    renderCalendar();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Render expenses
function renderExpenses() {
    expenseList.innerHTML = '';
    const emptyState = document.getElementById('emptyExpenseState');
    if (expenses.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }
    expenses.forEach((item, idx) => {
        const li = document.createElement('li');
        li.textContent = `${item.date} | ${item.category} | $${item.amount} | ${item.memo}`;
        li.style.cursor = 'pointer';
        li.onclick = function() {
            document.getElementById('amount').value = item.amount;
            document.getElementById('expenseDate').value = item.date;
            document.getElementById('category').value = item.category;
            document.getElementById('memo').value = item.memo;
            editExpenseIndex = idx;
            document.querySelector('#expenseForm button[type="submit"]').textContent = 'Save';
        };
        expenseList.appendChild(li);
    });
}

// Show/hide sections
function showSection(section) {
    listSection.classList.add('hidden');
    calendarSection.classList.add('hidden');
    accountBookSection.classList.add('hidden');
    if (section === 'list') listSection.classList.remove('hidden');
    if (section === 'calendar') calendarSection.classList.remove('hidden');
    if (section === 'accountbook') accountBookSection.classList.remove('hidden');
}

// Set active view button
function setActiveViewBtn(activeBtn) {
    [listViewBtn, calendarViewBtn, accountBookBtn].forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
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

accountBookBtn.addEventListener('click', () => {
    showSection('accountbook');
    setActiveViewBtn(accountBookBtn);
});
listViewBtn.addEventListener('click', () => {
    showSection('list');
    setActiveViewBtn(listViewBtn);
});
calendarViewBtn.addEventListener('click', () => {
    showSection('calendar');
    setActiveViewBtn(calendarViewBtn);
});

prevMonthBtn.addEventListener('click', () => navigateMonth('prev'));
nextMonthBtn.addEventListener('click', () => navigateMonth('next'));

clearDateFilterBtn.addEventListener('click', clearDateFilter);

expenseForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const amount = document.getElementById('amount').value;
    const date = document.getElementById('expenseDate').value;
    const category = document.getElementById('category').value;
    const memo = document.getElementById('memo').value;
    if (editExpenseIndex !== null) {
        expenses[editExpenseIndex] = { amount, date, category, memo };
        editExpenseIndex = null;
        document.querySelector('#expenseForm button[type="submit"]').textContent = 'Add';
    } else {
        expenses.push({ amount, date, category, memo });
    }
    localStorage.setItem('expenses', JSON.stringify(expenses));
    renderExpenses();
    expenseForm.reset();
});

document.addEventListener('DOMContentLoaded', function() {
    const categorySelect = document.getElementById('category');
    const categoryInputWrapper = document.getElementById('categoryInputWrapper');
    const newCategoryInput = document.getElementById('newCategory');
    const addCategoryBtn = document.getElementById('addCategoryBtn');

    categorySelect.addEventListener('change', function() {
        if (categorySelect.value === '__add_new__') {
            categoryInputWrapper.style.display = 'inline-flex';
            newCategoryInput.focus();
        } else {
            categoryInputWrapper.style.display = 'none';
        }
    });
    addCategoryBtn.addEventListener('click', function() {
        const newCat = newCategoryInput.value.trim();
        if (newCat && !Array.from(categorySelect.options).some(opt => opt.value.toLowerCase() === newCat.toLowerCase())) {
            const option = document.createElement('option');
            option.value = newCat;
            option.textContent = newCat;
            categorySelect.insertBefore(option, categorySelect.querySelector('option[value="__add_new__"]'));
            categorySelect.value = newCat;
            newCategoryInput.value = '';
        }
        categoryInputWrapper.style.display = 'none';
    });

    // Set today's date as default in date picker
    todoDateInput.value = formatDateForInput(new Date());

    // Initialize app
    loadTodos();
    renderExpenses();
});
