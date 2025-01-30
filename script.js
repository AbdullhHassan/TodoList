document.addEventListener('DOMContentLoaded', () => {
    // Theme Management
    const themeManager = {
        toggle: document.getElementById('themeToggle'),
        sunIcon: document.querySelector('.sun-icon'),
        moonIcon: document.querySelector('.moon-icon'),
        
        init() {
            // Initialize theme from localStorage or default to dark
            const savedTheme = localStorage.getItem('theme') || 'dark';
            this.setTheme(savedTheme);
            
            // Add click event listener for theme toggle
            this.toggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                this.setTheme(newTheme);
                
                // Add animation to theme toggle
                this.toggle.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    this.toggle.style.transform = 'scale(1)';
                }, 200);
            });
        },

        setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            document.querySelector('html').setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            
            if (theme === 'dark') {
                this.sunIcon.style.display = 'none';
                this.moonIcon.style.display = 'block';
            } else {
                this.sunIcon.style.display = 'block';
                this.moonIcon.style.display = 'none';
            }
        }
    };

    const todoInput = document.getElementById('todoInput');
    const addButton = document.getElementById('addButton');
    const todoList = document.getElementById('todoList');
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    const filterButtons = document.querySelectorAll('.filter-btn');

    // Initialize theme manager
    themeManager.init();

    // Tab Management
    const tabManager = {
        buttons: document.querySelectorAll('.tab-btn'),
        panes: document.querySelectorAll('.tab-pane'),

        init() {
            this.buttons.forEach(button => {
                button.addEventListener('click', () => this.switchTab(button.dataset.tab));
            });
        },

        switchTab(tabId) {
            this.buttons.forEach(btn => btn.classList.remove('active'));
            this.panes.forEach(pane => pane.classList.remove('active'));
            
            const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
            const activePane = document.getElementById(tabId);
            
            activeButton.classList.add('active');
            activePane.classList.add('active');
        }
    };

    // Pomodoro Timer Management
    const pomodoroManager = {
        display: document.querySelector('.time'),
        label: document.querySelector('.timer-label'),
        startButton: document.getElementById('startTimer'),
        resetButton: document.getElementById('resetTimer'),
        modeButtons: document.querySelectorAll('.mode-btn'),
        timeLeft: 25 * 60,
        timerId: null,
        isRunning: false,

        init() {
            this.startButton.addEventListener('click', () => this.toggleTimer());
            this.resetButton.addEventListener('click', () => this.resetTimer());
            this.modeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    this.modeButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    const minutes = parseInt(button.dataset.time);
                    const label = button.textContent;
                    this.setTimerMode(minutes, label);
                });
            });
            this.updateDisplay();
        },

        updateDisplay() {
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            this.display.textContent =
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        },

        toggleTimer() {
            if (!this.isRunning) {
                this.startTimer();
            } else {
                this.pauseTimer();
            }
        },

        startTimer() {
            this.isRunning = true;
            this.startButton.textContent = 'Pause';
            this.timerId = setInterval(() => {
                if (this.timeLeft > 0) {
                    this.timeLeft--;
                    this.updateDisplay();
                } else {
                    this.timerComplete();
                }
            }, 1000);
        },

        pauseTimer() {
            clearInterval(this.timerId);
            this.isRunning = false;
            this.startButton.textContent = 'Start';
        },

        resetTimer() {
            this.pauseTimer();
            this.timeLeft = parseInt(document.querySelector('.mode-btn.active').dataset.time) * 60;
            this.updateDisplay();
        },

        setTimerMode(minutes, label) {
            this.pauseTimer();
            this.timeLeft = minutes * 60;
            this.label.textContent = label;
            this.updateDisplay();
        },

        timerComplete() {
            this.pauseTimer();
            // Play notification sound
            const audio = new Audio('data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAYQAVVVVVVVVVVVVVVVVVVVVqqqqqqqqqqqqqqqqqqqqVVVVVVVVVVVVVVVVVVVV////////////////////////////////AAAAOkxBTUUzLjEwMAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MYxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
            audio.play().catch(e => console.log('Error playing sound:', e));
        }
    };

    // Initialize tab and timer managers
    tabManager.init();
    pomodoroManager.init();

    let currentFilter = 'all';

    // Load existing todos on page load
    loadTodos();

    // Add new todo when button is clicked
    addButton.addEventListener('click', addTodo);
    
    // Add new todo when Enter key is pressed
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo();
        }
    });

    // Filter buttons event listeners
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.dataset.filter;
            currentFilter = filter;
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            applyFilter();
        });
    });

    function showError(message, duration = 3000) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        setTimeout(() => {
            errorMessage.classList.add('hidden');
        }, duration);
    }

    function setLoading(isLoading) {
        const buttonText = addButton.querySelector('.button-text');
        const loader = addButton.querySelector('.loader');
        if (isLoading) {
            loading.classList.remove('hidden');
            buttonText.classList.add('hidden');
            loader.classList.remove('hidden');
            addButton.disabled = true;
        } else {
            loading.classList.add('hidden');
            buttonText.classList.remove('hidden');
            loader.classList.add('hidden');
            addButton.disabled = false;
        }
    }

    async function addTodo() {
        const text = todoInput.value.trim();
        if (!text) {
            showError('Please enter a todo item');
            return;
        }

        try {
            addButton.disabled = true;
            const response = await fetch('http://localhost:5000/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add todo');
            }

            const todo = await response.json();
            createTodoElement(todo);
            todoInput.value = '';
            // Play add sound
            addSound.currentTime = 0;
            addSound.play().catch(e => console.log('Error playing sound:', e));
        } catch (error) {
            showError(error.message);
        } finally {
            addButton.disabled = false;
        }
    }

    async function loadTodos() {
        try {
            setLoading(true);
            const response = await fetch('http://localhost:5000/todos');
            if (!response.ok) throw new Error('Failed to fetch todos');

            const todos = await response.json();
            todoList.innerHTML = '';
            todos.forEach(createTodoElement);
        } catch (error) {
            showError(error.message);
        } finally {
            setLoading(false);
        }
    }

    function createTodoElement(todo) {
        const li = document.createElement('li');
        li.className = 'todo-item';
        if (todo.completed) li.classList.add('completed');
        li.dataset.status = todo.completed ? 'completed' : 'active';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(todo.id, checkbox.checked, li));

        const textSpan = document.createElement('span');
        textSpan.className = 'todo-text';
        textSpan.textContent = todo.text;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'todo-time';
        updateTimeDisplay(timeSpan, todo.created_at, todo.completed_at);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteTodo(todo.id, li));

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'todo-actions';
        actionsDiv.appendChild(timeSpan);
        actionsDiv.appendChild(deleteBtn);

        li.appendChild(checkbox);
        li.appendChild(textSpan);
        li.appendChild(actionsDiv);

        if (shouldShowTodo(todo.completed)) {
            todoList.insertBefore(li, todoList.firstChild);
        } else {
            li.style.display = 'none';
        }

        // Update time display every minute if not completed
        if (!todo.completed) {
            setInterval(() => updateTimeDisplay(timeSpan, todo.created_at, todo.completed_at), 60000);
        }
    }

    async function toggleTodo(id, completed, li) {
        try {
            const response = await fetch(`http://localhost:5000/todos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ completed }),
            });

            if (!response.ok) throw new Error('Failed to update todo');

            const updatedTodo = await response.json();
            
            if (completed) {
                li.classList.add('completed');
            } else {
                li.classList.remove('completed');
            }

            li.dataset.status = completed ? 'completed' : 'active';
            const timeSpan = li.querySelector('.todo-time');
            updateTimeDisplay(timeSpan, updatedTodo.created_at, updatedTodo.completed_at);

            if (!shouldShowTodo(completed)) {
                li.style.display = 'none';
            }
        } catch (error) {
            showError(error.message);
            // Revert checkbox state
            const checkbox = li.querySelector('input[type="checkbox"]');
            checkbox.checked = !completed;
        }
    }

    async function deleteTodo(id, li) {
        try {
            // Play delete sound
            deleteSound.currentTime = 0;
            deleteSound.play().catch(e => console.log('Error playing sound:', e));

            // Add explosion animation
            li.classList.add('deleting');
            
            const response = await fetch(`http://localhost:5000/todos/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete todo');

            // Wait for animation to complete
            setTimeout(() => {
                li.remove();
            }, 600); // Match animation duration
        } catch (error) {
            showError(error.message);
            li.classList.remove('deleting');
        }
    }

    function updateTimeDisplay(element, createdAt, completedAt) {
        const created = new Date(createdAt);
        const now = new Date();
        
        if (completedAt) {
            const completed = new Date(completedAt);
            const duration = (completed - created) / 1000; // in seconds
            element.textContent = `Completed in ${formatDuration(duration)}`;
        } else {
            const duration = (now - created) / 1000; // in seconds
            element.textContent = `Active for ${formatDuration(duration)}`;
        }
    }

    function formatDuration(seconds) {
        if (seconds < 60) return `${Math.floor(seconds)}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        return `${Math.floor(seconds / 86400)}d`;
    }

    function shouldShowTodo(completed) {
        return currentFilter === 'all' || 
               (currentFilter === 'active' && !completed) || 
               (currentFilter === 'completed' && completed);
    }

    function applyFilter() {
        const todos = todoList.querySelectorAll('.todo-item');
        todos.forEach(todo => {
            const isCompleted = todo.classList.contains('completed');
            todo.style.display = shouldShowTodo(isCompleted) ? '' : 'none';
        });
    }
});
