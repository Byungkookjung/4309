// Application state
let todos = [];
let currentFilter = 'all';
let currentView = 'list'; // 'list' or 'calendar'
let currentDate = new Date();
let selectedDate = null; // For filtering by specific date

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
const calendarTasks = document.getElementById('calendarTasks');
const calendarTasksTitle = document.getElementById('calendarTasksTitle');
const calendarTasksCount = document.getElementById('calendarTasksCount');
const calendarTasksList = document.getElementById('calendarTasksList');
const calendarTasksEmpty = document.getElementById('calendarTasksEmpty');

const authApi = window.__ledgerAuth || {};
const requireAuthRef = authApi.requireAuth;
const dbRef = authApi.db;
let currentUser = null;
let todoUnsub = null;

function isRemoteEnabled() {
    return !!(currentUser && dbRef);
}

function todosCollection(user) {
    return dbRef.collection('users').doc(user.uid).collection('todos');
}

function startTodoSync(user) {
    if (!dbRef) return;
    if (todoUnsub) todoUnsub();
    todoUnsub = todosCollection(user).onSnapshot(snapshot => {
        todos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTodos();
        renderCalendar();
        renderCalendarTasks();
    });
}

// --- Plan Calculator (store under 'planItems') ---
const planLabelInput = document.getElementById('planLabel');
const planUnitInput = document.getElementById('planUnit');
const planQtyInput = document.getElementById('planQty');
const addPlanBtn = document.getElementById('addPlanBtn');
const planListEl = document.getElementById('planList');
const planTotalEl = document.getElementById('planTotal');
const clearPlanBtn = document.getElementById('clearPlanBtn');

let planItems = [];

// Load todos from localStorage
function loadTodos() {
    const storedTodos = localStorage.getItem('todos');
    if (storedTodos) {
        todos = JSON.parse(storedTodos);
    }
    renderTodos();
    renderCalendar();
    renderCalendarTasks();
}

// Save todos to localStorage
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// Load plan items from localStorage
function loadPlanItems() {
    const raw = localStorage.getItem('planItems');
    planItems = raw ? JSON.parse(raw) : [];
}

// Save plan items to localStorage
function savePlanItems() {
    localStorage.setItem('planItems', JSON.stringify(planItems));
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';
    // Parse date string as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
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
    today.setHours(0, 0, 0, 0);
    // Parse date string as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
}

// Check if date is in the future
function isUpcoming(dateString) {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Parse date string as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date > today;
}

// Add new todo
async function addTodo() {
    const text = todoInput.value.trim();
    if (text === '') {
        return;
    }

    const newTodo = {
        id: Date.now().toString(),
        text: text,
        completed: false,
        createdAt: new Date().toISOString(),
        dueDate: todoDateInput.value || null
    };

    todoInput.value = '';
    todoDateInput.value = '';

    if (isRemoteEnabled()) {
        await todosCollection(currentUser).doc(newTodo.id).set(newTodo);
        return;
    }

    todos.push(newTodo);
    saveTodos();
    renderTodos();
    renderCalendar();
    renderCalendarTasks();
}

// Delete todo
async function deleteTodo(id) {
    if (isRemoteEnabled()) {
        await todosCollection(currentUser).doc(String(id)).delete();
        return;
    }

    todos = todos.filter(todo => todo.id !== id);
    saveTodos();
    renderTodos();
    renderCalendar();
    renderCalendarTasks();
}

// Toggle todo completion
async function toggleTodo(id) {
    if (isRemoteEnabled()) {
        const todo = todos.find(item => item.id === String(id));
        if (!todo) return;
        await todosCollection(currentUser).doc(String(id)).update({ completed: !todo.completed });
        return;
    }

    todos = todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    saveTodos();
    renderTodos();
    renderCalendar();
    renderCalendarTasks();
}

// Edit todo
async function editTodo(id, newText, newDate = null) {
    if (newText.trim() === '') {
        return;
    }

    if (isRemoteEnabled()) {
        const payload = { text: newText.trim() };
        if (newDate !== undefined) {
            payload.dueDate = newDate || null;
        }
        await todosCollection(currentUser).doc(String(id)).update(payload);
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
    renderCalendarTasks();
}

// Clear completed todos
async function clearCompleted() {
    if (isRemoteEnabled()) {
        const batch = dbRef.batch();
        todos.filter(todo => todo.completed).forEach(todo => {
            const ref = todosCollection(currentUser).doc(String(todo.id));
            batch.delete(ref);
        });
        await batch.commit();
        return;
    }

    todos = todos.filter(todo => !todo.completed);
    saveTodos();
    renderTodos();
    renderCalendar();
    renderCalendarTasks();
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

// Render tasks for selected date inside calendar view
function renderCalendarTasks() {
    // If no date selected, show prompt
    if (!selectedDate) {
        calendarTasksTitle.textContent = 'Select a date to view tasks';
        calendarTasksCount.textContent = '';
        calendarTasksList.innerHTML = '';
        calendarTasksEmpty.textContent = 'Select a date to view tasks.';
        calendarTasksEmpty.classList.remove('hidden');
        return;
    }

    const selectedDateStr = formatDateForInput(selectedDate);
    const dayTodos = todos.filter(todo => todo.dueDate === selectedDateStr);

    calendarTasksTitle.textContent = `Tasks for ${formatDate(selectedDateStr)}`;
    calendarTasksCount.textContent = dayTodos.length ? `${dayTodos.length} task${dayTodos.length === 1 ? '' : 's'}` : '';

    if (dayTodos.length === 0) {
        calendarTasksList.innerHTML = '';
        calendarTasksEmpty.textContent = 'No tasks for this date. Add one in the list view.';
        calendarTasksEmpty.classList.remove('hidden');
        return;
    }

    calendarTasksEmpty.classList.add('hidden');
    calendarTasksList.innerHTML = '';

    dayTodos
        .sort((a, b) => a.completed - b.completed) // active first
        .forEach(todo => {
            const li = document.createElement('li');
            li.className = 'calendar-task-item';

            const text = document.createElement('span');
            text.className = 'calendar-task-text';
            text.textContent = todo.text;

            const status = document.createElement('span');
            status.className = `calendar-task-status ${todo.completed ? 'completed' : 'active'}`;
            status.textContent = todo.completed ? 'Completed' : 'Active';

            const actions = document.createElement('div');
            actions.className = 'calendar-task-actions';

            const toggleBtn = document.createElement('button');
            toggleBtn.textContent = todo.completed ? 'Mark Active' : 'Complete';
            toggleBtn.className = 'calendar-task-btn';
            toggleBtn.addEventListener('click', () => toggleTodo(todo.id));

            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.className = 'calendar-task-btn secondary';
            editBtn.addEventListener('click', () => {
                const newText = prompt('Edit task', todo.text);
                if (newText !== null) {
                    editTodo(todo.id, newText, todo.dueDate);
                }
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'calendar-task-btn danger';
            deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

            actions.appendChild(toggleBtn);
            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);

            li.appendChild(text);
            li.appendChild(status);
            li.appendChild(actions);
            calendarTasksList.appendChild(li);
        });
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
        // Update empty state message based on filter
        const emptyStateText = emptyState.querySelector('p');
        if (selectedDate) {
            emptyStateText.textContent = `\u2728 No tasks for ${formatDate(formatDateForInput(selectedDate))}. Add one above!`;
        } else {
            emptyStateText.textContent = '\u2728 No tasks yet. Add one above to get started!';
        }
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
            ? `<span class="todo-date ${isToday(todo.dueDate) ? 'today' : ''}">\u{1F4C5} ${formatDate(todo.dueDate)}</span>` 
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
            renderCalendarTasks();
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
        renderCalendarTasks();
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
    renderCalendarTasks();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format currency
function formatCurrency(num) {
    return '$' + Number(num || 0).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
}

// Calculate total plan amount
function calculatePlanTotal() {
    return planItems.reduce((sum, it) => sum + (Number(it.unit || 0) * Number(it.qty || 0)), 0);
}

// Render plan items
function renderPlan() {
    planListEl.innerHTML = '';
    planItems.forEach(item => {
        const li = document.createElement('li');
        li.className = 'plan-item';
        li.dataset.id = item.id;
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.textContent = `${item.label || ''} - ${item.qty} x ${formatCurrency(item.unit)}`;
        const amount = document.createElement('div');
        amount.className = 'amount';
        const total = Number(item.unit) * Number(item.qty);
        amount.textContent = formatCurrency(total);
        const actions = document.createElement('div');
        actions.className = 'actions';
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.textContent = 'Delete';
        delBtn.addEventListener('click', () => {
            planItems = planItems.filter(p => p.id !== item.id);
            savePlanItems();
            renderPlan();
        });
        actions.appendChild(delBtn);

        li.appendChild(meta);
        li.appendChild(amount);
        li.appendChild(actions);
        planListEl.appendChild(li);
    });

    const total = calculatePlanTotal();
    planTotalEl.textContent = formatCurrency(total);
}

// Add plan item
function addPlanItem() {
    const label = (planLabelInput.value || '').trim();
    const unit = parseFloat(planUnitInput.value);
    const qty = parseInt(planQtyInput.value, 10);

    if (!label || isNaN(unit) || isNaN(qty) || qty <= 0 || unit < 0) {
        alert('Please enter valid label, unit amount and quantity.');
        return;
    }

    const item = {
        id: Date.now(),
        label,
        unit: Number(unit.toFixed(2)),
        qty: qty
    };
    planItems.push(item);
    savePlanItems();
    planLabelInput.value = '';
    planUnitInput.value = '';
    planQtyInput.value = '';
    renderPlan();
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

listViewBtn.addEventListener('click', () => switchView('list'));
calendarViewBtn.addEventListener('click', () => switchView('calendar'));

prevMonthBtn.addEventListener('click', () => navigateMonth('prev'));
nextMonthBtn.addEventListener('click', () => navigateMonth('next'));

clearDateFilterBtn.addEventListener('click', clearDateFilter);

// Add navigation for Expense Ledger button
{
    const ledgerBtn = document.getElementById('ledgerBtn');
    if (ledgerBtn) {
        ledgerBtn.addEventListener('click', () => {
            window.location.href = 'ledger.html';
        });
    }
}

// Initialize app
if (requireAuthRef) {
    requireAuthRef().then(user => {
        currentUser = user;
        startTodoSync(user);
    });
} else {
    loadTodos();
}
