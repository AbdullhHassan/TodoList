document.addEventListener("DOMContentLoaded", () => {
  // Theme Management
  const themeManager = {
    // toggle: document.getElementById("themeToggle"),
    // sunIcon: document.querySelector(".sun-icon"),
    // moonIcon: document.querySelector(".moon-icon"),

    async init() {
      await settingsManager.load();

      // // Initialize theme from settings or default to dark
      // const theme = settingsManager.get("theme.default") || "dark";
      // this.setTheme(theme);

      // Add click event listener for theme toggle
      // this.toggle.addEventListener("click", () => {
      //   const currentTheme =
      //     document.documentElement.getAttribute("data-theme");
      //   const newTheme = currentTheme === "light" ? "dark" : "light";
      //   this.setTheme(newTheme);

      //   // Add animation to theme toggle
      //   this.toggle.style.transform = "scale(0.8)";
      //   setTimeout(() => {
      //     this.toggle.style.transform = "scale(1)";
      //   }, 200);
      // });

      // Apply custom colors from settings
      const accentColor = settingsManager.get("theme.accentColor");
      const timerAccent = settingsManager.get("theme.timerAccent");
      if (accentColor)
        document.documentElement.style.setProperty(
          "--accent-color",
          accentColor
        );
      if (timerAccent)
        document.documentElement.style.setProperty(
          "--timer-accent",
          timerAccent
        );
    },

    setTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      document.querySelector("html").setAttribute("data-theme", theme);

      // Update settings
      settingsManager.settings.theme.default = theme;
      settingsManager.save();

      if (theme === "dark") {
        this.sunIcon.style.display = "none";
        this.moonIcon.style.display = "block";
      } else {
        this.sunIcon.style.display = "block";
        this.moonIcon.style.display = "none";
      }
    },
  };

  const todoInput = document.getElementById("todoInput");
  const addButton = document.getElementById("addButton");
  const todoList = document.getElementById("todoList");
  const loading = document.getElementById("loading");
  const errorMessage = document.getElementById("error-message");
  const filterButtons = document.querySelectorAll(".filter-btn");

  // Initialize theme manager
  themeManager.init();

  // Tab Management
  const tabManager = {
    buttons: document.querySelectorAll(".tab-btn"),
    panes: document.querySelectorAll(".tab-pane"),

    init() {
      this.buttons.forEach((button) => {
        button.addEventListener("click", () =>
          this.switchTab(button.dataset.tab)
        );
      });
    },

    switchTab(tabId) {
      this.buttons.forEach((btn) => btn.classList.remove("active"));
      this.panes.forEach((pane) => pane.classList.remove("active"));

      const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
      const activePane = document.getElementById(tabId);

      activeButton.classList.add("active");
      activePane.classList.add("active");
    },
  };

  // Pomodoro Timer Management
  const settingsManager = {
    settings: null,

    async load() {
      try {
        const response = await fetch("settings.json");
        if (!response.ok) throw new Error("Failed to load settings");
        this.settings = await response.json();
      } catch (error) {
        console.error("Error loading settings:", error);
        this.settings = {
          pomodoro: {
            workTime: 25,
            shortBreak: 5,
            longBreak: 15,
            autoStartBreaks: false,
            autoStartPomodoros: false,
            longBreakInterval: 4,
            soundEnabled: true,
            notificationsEnabled: true,
          },
        };
      }
      return this.settings;
    },

    async save() {
      try {
        const response = await fetch("settings.json", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(this.settings, null, 2),
        });
        if (!response.ok) throw new Error("Failed to save settings");
      } catch (error) {
        console.error("Error saving settings:", error);
        showError("Failed to save settings. Changes will be temporary.");
      }
    },

    get(path) {
      return path.split(".").reduce((obj, key) => obj?.[key], this.settings);
    },

    set(path, value) {
      const keys = path.split(".");
      const lastKey = keys.pop();
      const target = keys.reduce(
        (obj, key) => (obj[key] = obj[key] || {}),
        this.settings
      );
      target[lastKey] = value;
      this.save();
    },
  };

  const pomodoroManager = {
    display: document.querySelector(".time"),
    label: document.querySelector(".timer-label"),
    startButton: document.getElementById("startTimer"),
    resetButton: document.getElementById("resetTimer"),
    modeButtons: document.querySelectorAll(".mode-btn"),
    workTimeInput: null,
    shortBreakInput: null,
    longBreakInput: null,
    timeLeft: 25 * 60,
    timerId: null,
    isRunning: false,
    pomodorosCompleted: 0,

    async init() {
      await settingsManager.load();

      this.startButton.addEventListener("click", () => this.toggleTimer());
      this.resetButton.addEventListener("click", () => this.resetTimer());
      this.modeButtons.forEach((button) => {
        button.addEventListener("click", () => {
          this.modeButtons.forEach((btn) => btn.classList.remove("active"));
          button.classList.add("active");
          const minutes = parseInt(button.dataset.time);
          const label = button.textContent;
          this.setTimerMode(minutes, label);
        });
      });

      this.loadSettings();
      this.updateDisplay();
    },

    loadSettings() {
      const settings = settingsManager.get("pomodoro");

      // Get settings inputs
      this.workTimeInput = document.getElementById("workTime");
      this.shortBreakInput = document.getElementById("shortBreak");
      this.longBreakInput = document.getElementById("longBreak");

      // Set values from settings
      this.workTimeInput.value = settings.workTime.toString();
      this.shortBreakInput.value = settings.shortBreak.toString();
      this.longBreakInput.value = settings.longBreak.toString();

      // Add change listeners
      this.workTimeInput.addEventListener("change", () =>
        this.updateTimerDurations()
      );
      this.shortBreakInput.addEventListener("change", () =>
        this.updateTimerDurations()
      );
      this.longBreakInput.addEventListener("change", () =>
        this.updateTimerDurations()
      );

      // Initialize timer durations
      this.updateTimerDurations();
    },

    updateTimerDurations() {
      const workTime = parseInt(this.workTimeInput.value) || 25;
      const shortBreakTime = parseInt(this.shortBreakInput.value) || 5;
      const longBreakTime = parseInt(this.longBreakInput.value) || 15;

      if (workTime <= 0 || shortBreakTime <= 0 || longBreakTime <= 0) {
        showError("Timer values must be positive numbers.");
        const defaults = settingsManager.get("pomodoro");
        this.workTimeInput.value = defaults.workTime.toString();
        this.shortBreakInput.value = defaults.shortBreak.toString();
        this.longBreakInput.value = defaults.longBreak.toString();
        return;
      }

      // Update settings
      settingsManager.settings.pomodoro = {
        ...settingsManager.settings.pomodoro,
        workTime,
        shortBreak: shortBreakTime,
        longBreak: longBreakTime,
      };
      settingsManager.save();

      // Update mode buttons
      this.modeButtons[0].dataset.time = workTime;
      this.modeButtons[1].dataset.time = shortBreakTime;
      this.modeButtons[2].dataset.time = longBreakTime;

      // Update current timer if it's not running
      if (!this.isRunning) {
        const activeMode = document.querySelector(".mode-btn.active");
        const minutes = parseInt(activeMode.dataset.time);
        const label = activeMode.textContent;
        this.setTimerMode(minutes, label);
      }
    },

    updateDisplay() {
      const minutes = Math.floor(this.timeLeft / 60);
      const seconds = this.timeLeft % 60;
      this.display.textContent = `${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
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
      this.startButton.textContent = "Pause";
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
      this.startButton.textContent = "Start";
    },

    resetTimer() {
      this.pauseTimer();
      this.timeLeft =
        parseInt(document.querySelector(".mode-btn.active").dataset.time) * 60;
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
      const audio = new Audio(
        "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAYQAVVVVVVVVVVVVVVVVVVVVVVqqqqqqqqqqqqqqqqqqqqVVVVVVVVVVVVVVVVVVVVVV////////////////////////////////AAAAOkxBTUUzLjEwMAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MYxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV"
      );
      audio.play().catch((e) => console.log("Error playing sound:", e));
    },
  };

  // Initialize tab and timer managers
  tabManager.init();
  pomodoroManager.init();

  let currentFilter = "all";

  // Load existing todos on page load
  loadTodos();

  // Add new todo when button is clicked
  addButton.addEventListener("click", addTodo);

  // Add new todo when Enter key is pressed
  todoInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addTodo();
    }
  });

  // Filter buttons event listeners
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      currentFilter = filter;
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      applyFilter();
    });
  });

  function showError(message, duration = 3000) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
    setTimeout(() => {
      errorMessage.classList.add("hidden");
    }, duration);
  }

  function setLoading(isLoading) {
    const buttonText = addButton.querySelector(".button-text");
    const loader = addButton.querySelector(".loader");
    if (isLoading) {
      loading.classList.remove("hidden");
      buttonText.classList.add("hidden");
      loader.classList.remove("hidden");
      addButton.disabled = true;
    } else {
      loading.classList.add("hidden");
      buttonText.classList.remove("hidden");
      loader.classList.add("hidden");
      addButton.disabled = false;
    }
  }

  async function addTodo() {
    const text = todoInput.value.trim();
    if (!text) {
      showError("Please enter a todo item");
      return;
    }

    try {
      addButton.disabled = true;
      const response = await fetch("http://localhost:5000/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add todo");
      }

      const todo = await response.json();
      createTodoElement(todo);
      todoInput.value = "";
      // Play add sound
      addSound.currentTime = 0;
      addSound.play().catch((e) => console.log("Error playing sound:", e));
    } catch (error) {
      showError(error.message);
    } finally {
      addButton.disabled = false;
    }
  }

  async function loadTodos() {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:5000/todos");
      if (!response.ok)
        throw new Error("Failed to fetch todos (start the app using run.py)");

      const todos = await response.json();
      todoList.innerHTML = "";
      todos.forEach(createTodoElement);
    } catch (error) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function createTodoElement(todo) {
    const li = document.createElement("li");
    li.className = "todo-item";
    if (todo.completed) li.classList.add("completed");
    li.dataset.status = todo.completed ? "completed" : "active";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.addEventListener("change", () =>
      toggleTodo(todo.id, checkbox.checked, li)
    );

    const textSpan = document.createElement("span");
    textSpan.className = "todo-text";
    textSpan.textContent = todo.text;

    const timeSpan = document.createElement("span");
    timeSpan.className = "todo-time";
    updateTimeDisplay(timeSpan, todo.created_at, todo.completed_at);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteTodo(todo.id, li));

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "todo-actions";
    actionsDiv.appendChild(timeSpan);
    actionsDiv.appendChild(deleteBtn);

    li.appendChild(checkbox);
    li.appendChild(textSpan);
    li.appendChild(actionsDiv);

    if (shouldShowTodo(todo.completed)) {
      todoList.insertBefore(li, todoList.firstChild);
    } else {
      li.style.display = "none";
    }

    // Update time display every minute if not completed
    if (!todo.completed) {
      setInterval(
        () => updateTimeDisplay(timeSpan, todo.created_at, todo.completed_at),
        60000
      );
    }
  }

  async function toggleTodo(id, completed, li) {
    try {
      const response = await fetch(`http://localhost:5000/todos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) throw new Error("Failed to update todo");

      const updatedTodo = await response.json();

      if (completed) {
        li.classList.add("completed");
      } else {
        li.classList.remove("completed");
      }

      li.dataset.status = completed ? "completed" : "active";
      const timeSpan = li.querySelector(".todo-time");
      updateTimeDisplay(
        timeSpan,
        updatedTodo.created_at,
        updatedTodo.completed_at
      );

      if (!shouldShowTodo(completed)) {
        li.style.display = "none";
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
      deleteSound.play().catch((e) => console.log("Error playing sound:", e));

      // Add explosion animation
      li.classList.add("deleting");

      const response = await fetch(`http://localhost:5000/todos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete todo");

      // Wait for animation to complete
      setTimeout(() => {
        li.remove();
      }, 600); // Match animation duration
    } catch (error) {
      showError(error.message);
      li.classList.remove("deleting");
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
    return (
      currentFilter === "all" ||
      (currentFilter === "active" && !completed) ||
      (currentFilter === "completed" && completed)
    );
  }

  function applyFilter() {
    const todos = todoList.querySelectorAll(".todo-item");
    todos.forEach((todo) => {
      const isCompleted = todo.classList.contains("completed");
      todo.style.display = shouldShowTodo(isCompleted) ? "" : "none";
    });
  }

  // AI Tasks Modal Management
  const aiModalManager = {
    modal: document.getElementById("aiModal"),
    openBtn: document.getElementById("openAIModal"),
    closeBtn: document.getElementById("closeAIModal"),
    generateBtn: document.getElementById("generateTasks"),
    thoughtsInput: document.getElementById("thoughtsInput"),
    progressBar: document.querySelector(".progress-bar"),
    progressText: document.querySelector(".progress-text"),
    lastSoundPlayed: 0,
    SOUND_DELAY: 200, // Minimum delay between sounds in ms

    validateSettings(settings) {
      if (!settings?.endpoint) {
        throw new Error("AI endpoint not configured in settings");
      }
      if (!settings?.model) {
        throw new Error("AI model not configured in settings");
      }
      return {
        endpoint: settings.endpoint,
        model: settings.model,
        temperature: settings.temperature || 0.7,
        maxTokens: settings.maxTokens || 500,
        timeout: settings.timeout || 30000
      };
    },

    async init() {
      try {
        await settingsManager.load();
        const aiSettings = settingsManager.get("ai");
        this.validateSettings(aiSettings);
        
        // Setup event listeners
        this.openBtn.addEventListener("click", () => this.openModal());
        this.closeBtn.addEventListener("click", () => this.closeModal());
        this.modal.addEventListener("click", (e) => {
          if (e.target === this.modal) this.closeModal();
        });
        this.generateBtn.addEventListener("click", () => this.generateTasks());
        
        // Warm up model in background
        this.warmupModel();
      } catch (error) {
        console.error("AI initialization error:", error);
        this.openBtn.disabled = true;
        this.openBtn.title = error.message;
      }
    },

    async warmupModel() {
      try {
        const aiSettings = this.validateSettings(settingsManager.get("ai"));
        const warmupPrompt = "Convert this into a task list:";
        
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 2000);

        const response = await fetch(aiSettings.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: aiSettings.model,
            temperature: 0,
            max_tokens: 10,
            prompt: warmupPrompt
          }),
          signal: controller.signal
        });
        
        if (!response.ok) throw new Error("Warmup failed");
      } catch (error) {
        console.warn("Model warmup skipped:", error.message);
      }
    },

    updateProgress(percent, text) {
      requestAnimationFrame(() => {
        this.progressBar.style.width = `${percent}%`;
        this.progressText.textContent = text;
      });
    },

    openModal() {
      this.modal.classList.add("active");
      requestAnimationFrame(() => this.thoughtsInput.focus());
      this.resetProgress();
    },

    closeModal() {
      this.modal.classList.remove("active");
      this.thoughtsInput.value = "";
      this.resetProgress();
    },

    resetProgress() {
      this.updateProgress(0, "");
    },

    async playSound(sound) {
      const now = Date.now();
      if (now - this.lastSoundPlayed >= this.SOUND_DELAY) {
        this.lastSoundPlayed = now;
        sound.currentTime = 0;
        await sound.play().catch(e => console.warn("Error playing sound:", e));
      }
    },

    toggleLoadingState(loading) {
      const buttonText = this.generateBtn.querySelector(".button-text");
      const loader = this.generateBtn.querySelector(".loader");
      buttonText.classList.toggle("hidden", loading);
      loader.classList.toggle("hidden", !loading);
      this.generateBtn.disabled = loading;
    },

    buildPrompt(thoughts) {
      return `Convert this into specific 15-minute tasks:
${thoughts}

Requirements:
- Each task must begin with "15min:"
- Tasks must be specific and actionable
- Tasks must be practical and achievable
- Keep tasks clear and concise
- Focus on concrete steps
- Avoid vague or general tasks

Only output tasks, one per line.`;
    },

    async generateTasks() {
      const thoughts = this.thoughtsInput.value.trim();
      if (!thoughts) {
        showError("Please enter your thoughts or goals first");
        return;
      }

      this.toggleLoadingState(true);

      try {
        const aiSettings = this.validateSettings(settingsManager.get("ai"));
        
        this.updateProgress(10, "Initializing...");
        
        const controller = new AbortController();
        setTimeout(() => controller.abort(), aiSettings.timeout);

        this.updateProgress(20, "Generating tasks...");
        
        const response = await fetch(aiSettings.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: aiSettings.model,
            temperature: aiSettings.temperature,
            max_tokens: aiSettings.maxTokens,
            prompt: this.buildPrompt(thoughts)
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Failed to generate tasks. Please check if the AI service is running.");
        }

        const data = await response.json();
        if (!data?.response) {
          throw new Error("Invalid response from AI service");
        }

        this.updateProgress(40, "Processing tasks...");

        const tasks = data.response
          .split("\n")
          .filter(task => task.trim().startsWith("15min:"))
          .map(task => task.replace(/^15min:\s*/, "").trim())
          .filter(task => task.length > 0 && task.length <= 200); // Reasonable length limit

        if (tasks.length === 0) {
          throw new Error("No valid tasks generated. Please try with more specific input.");
        }

        this.updateProgress(60, `Adding ${tasks.length} tasks...`);

        const addedTasks = [];
        let progress = 60;
        const progressIncrement = 30 / tasks.length;

        for (const task of tasks) {
          try {
            const todo = await fetch("http://localhost:5000/todos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: task })
            });
            
            if (todo.ok) {
              const newTask = await todo.json();
              createTodoElement(newTask);
              addedTasks.push(task);
              await this.playSound(addSound);
              
              progress += progressIncrement;
              this.updateProgress(progress, `Added ${addedTasks.length} of ${tasks.length} tasks...`);
            }
          } catch (error) {
            console.error("Failed to add task:", task, error);
          }
        }

        if (addedTasks.length === 0) {
          throw new Error("Failed to add tasks. Please ensure the todo server is running.");
        }

        this.updateProgress(100, "Complete!");
        setTimeout(() => {
          this.closeModal();
          tabManager.switchTab("todos");
          showError(`Successfully created ${addedTasks.length} tasks!`, 2000);
        }, 500);
      } catch (error) {
        console.error("Task generation error:", error);
        showError(error.message || "Failed to generate tasks");
      } finally {
        this.toggleLoadingState(false);
      }
    }
  };

  // Initialize AI modal manager
  aiModalManager.init();
});
