document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.querySelector(".menu-toggle");
    const NAV_COLLAPSED_KEY = "studenthub_nav_collapsed";

    function setNavCollapsed(isCollapsed) {
        document.body.classList.toggle("nav-collapsed", isCollapsed);
        localStorage.setItem(NAV_COLLAPSED_KEY, isCollapsed ? "1" : "0");
        if (menuToggle) {
            menuToggle.setAttribute("aria-expanded", (!isCollapsed).toString());
        }
    }

    if (menuToggle) {
        const savedCollapsed = localStorage.getItem(NAV_COLLAPSED_KEY) === "1";
        setNavCollapsed(savedCollapsed);
        menuToggle.addEventListener("click", () => {
            const next = !document.body.classList.contains("nav-collapsed");
            setNavCollapsed(next);
        });
    }

    /* Date Buttons Interactivity */
    const todayBtn = document.getElementById("today-btn");
    const previousBtn = document.getElementById("previous-btn");
    const nextBtn = document.getElementById("next-btn");

    /* Date/Day Changes Interactivity */
    const dateDisplay = document.getElementById("date-display");
    const dayDisplay = document.getElementById("day-display");

    // TODAY'S TASKS (connecting to HTML) variables definition
    const addTaskBtn = document.getElementById("add-task-btn");
    const backdrop = document.getElementById("modal-backdrop");
    const modal = document.getElementById("add-task-modal");

    const titleInput = document.getElementById("task-title");
    const notesInput = document.getElementById("task-notes");
    const prioritySelect = document.getElementById("task-priority");

    const cancelBtn = document.getElementById("cancel-task-btn");
    const confirmBtn = document.getElementById("confirm-task-btn");
    const deleteBtn = document.getElementById("delete-task-btn");

    const taskListEl = document.getElementById("task-list");
    const statusEl = document.getElementById("task-status");

    const sortBtn = document.getElementById("sort-btn");
    const sortPanel = document.getElementById("sort-panel");
    const sortSelect = document.getElementById("sort-select");
    let currentSortMode = localStorage.getItem("taskSortMode") || "createdNewOld"; // load saved sort mode (default: createdNewOld)
    sortSelect.value = currentSortMode;

    // SYSTEM SETTINGS
    const systemSettingsBtn = document.getElementById("system-settings-btn");
    const systemSettingsModal = document.getElementById("system-settings-modal");
    const navButtons = document.querySelectorAll(".settings-nav");
    const panels = document.querySelectorAll(".settings-panel");
    const subtitle = document.getElementById("settings-subtitle");
    const darkToggle = document.getElementById("dark-mode-toggle"); // for dark mode

    // Load the last selected date from localStorage (so that when you referesh, you keep your place)
    const savedDate = localStorage.getItem("selectedDate");

    // IF there is a saved date, use it. Otherwise default to today.
    let selectedDate = new Date();

    // Normalise the time to midday to avoid timezone issues
    selectedDate.setHours(12, 0, 0, 0);

    let editingTaskId = null;

    const STATUS_MS = 1500;
    let statusTimer = null;

    // temporary welcome (username) logic to handle just ONE user for now (will update later for multi-user purposes)
    document.getElementById("welcome-name").textContent = "Spencer";

    // converts selectedDate to YYYY-MM-DD
    function dateKey(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, "0");
        const d = String(dateObj.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    // load/save tasks object from localStorage
    function loadAllTasks() {
        const raw = localStorage.getItem("tasksByDate");
        return raw ? JSON.parse(raw) : {}; // {} means none yet
    }

    function saveAllTasks(tasksByDate) {
        localStorage.setItem("tasksByDate", JSON.stringify(tasksByDate));
    }

    // render tasks for the currently selected date
    function renderTasksForSelectedDate() {
        const tasksByDate = loadAllTasks();
        const key = dateKey(selectedDate);
        const tasks = tasksByDate[key] || [];

        const sortedTasks = sortTasks(tasks, currentSortMode); // apply the currently selected sort mode (front-end only for now, more backend logic to be implemented)
        
        taskListEl.innerHTML = ""; // clears the old list

        sortedTasks.forEach((t) => {
            const li = document.createElement("li");
            li.textContent = `${t.title} (${t.priority})`;
            li.dataset.taskId = t.id; // attach the task id to the element (so clicks can find the correct task)
            taskListEl.appendChild(li);
        });
    }

    /* helper fumctions for dates */
    // returns a string that gives the full date and year in the Australian format
    function formatFullDate(dateObj) {
        const day = dateObj.getDate(); // 1-31
        const monthName = dateObj.toLocaleString("en-AU", {month: "long" }); // Jan, Feb etc.
        const year = dateObj.getFullYear(); // 2026
        return `${day} ${monthName} ${year}`;
    }

    // converts a date into a weekday like "Saturday" - essentially mapping a date to its correct day of the week
    function formatDayOfTheWeek(dateObj) {
        return dateObj.toLocaleString("en-AU", {weekday: "long" });
    }

    // Updates the UI (i.e., the text on-screen)
    function renderDate() {
        dateDisplay.textContent = formatFullDate(selectedDate);
        dayDisplay.textContent = formatDayOfTheWeek(selectedDate);

        localStorage.setItem("selectedDate", selectedDate.toISOString()); // save the selected date so that refreshing the page doesn't reset it

        renderTasksForSelectedDate(); // keeps tasks synced with the displayed date
    }

    // this is the logic that facilitates a user being able to go back and forth on dates using the arrow buttons
    function changeDay (amount) {
        // Make a copy of the current date. This is a good habit to avoid accidental weird references later
        const newDate = new Date(selectedDate);

        // Add/subtract days
        newDate.setDate(newDate.getDate() + amount);

        // Normalise time again (just to be sure)
        newDate.setHours(12, 0, 0, 0);

        // Update main state variable
        selectedDate = newDate;

        // Update what user sees
        renderDate();
    }

    function goToToday (){
        selectedDate = new Date();
        selectedDate.setHours(12, 0, 0, 0);
        renderDate();
    }

    /* modal open/close */
    function openModal() {
        let editingTaskId = null; // force add-mode
        
        document.getElementById("task-modal-title").textContent = "ADD TASK";
        confirmBtn.textContent = "Add";
        document.getElementById("delete-task-btn").classList.add("hidden");

        backdrop.classList.remove("hidden");
        modal.classList.remove("hidden");
        titleInput.value = "";
        notesInput.value = "";
        prioritySelect.value = "medium";
        statusEl.textContent = "";
        titleInput.focus(); // subtle UX improvement
        closeSortPanel();
    }

    function closeModal() {
        backdrop.classList.add("hidden");
        modal.classList.add("hidden");
    }

    /* ===========================
       MAIN TODAY'S TASK FUNCTIONS
       ===========================
    */
    /* ADD TASK */
    function addTask() {
        const title = titleInput.value.trim();
        const notes = notesInput.value.trim();
        const priority = prioritySelect.value;

        // Simple input validation so far
        if (!title) {
            alert("Title is required.");
            return;
        }

        const tasksByDate = loadAllTasks();
        const key = dateKey(selectedDate);
        const now = Date.now();

        // check to ensure array exists for that date
        if (!tasksByDate[key]) tasksByDate[key] = [];

        // create a task object (use THIS to iterate and add to this later for any other add task elements i may think are needed)
        const newTask = {
            id: Date.now(),
            title,
            notes,
            priority,
            done: false,
            createdAt: now,
            updatedAt: now // so "last updated" works from day one
        }

        tasksByDate[key].push(newTask) // Similar to python append logic from mini-project last year

        saveAllTasks(tasksByDate);
        renderTasksForSelectedDate();

        showStatus("Task added successfully.", { closeAfter: true });
    }

    /* TASK INFO LOADER */
    function openEditModal(taskId) {
        const tasksByDate = loadAllTasks();
        const key = dateKey(selectedDate);
        const tasks = tasksByDate[key] || [];

        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        editingTaskId = taskId;

        // fill inputs
        titleInput.value = task.title;
        notesInput.value = task.notes || "";
        prioritySelect.value = task.priority;

        // update modal heading + buttons
        document.getElementById("task-modal-title").textContent = "EDIT TASK";
        document.getElementById("confirm-task-btn").textContent = "Save";
        document.getElementById("delete-task-btn").classList.remove("hidden");

        backdrop.classList.remove("hidden");
        modal.classList.remove("hidden");
    }

    /* TASK EDITS + SAVES */
    function saveEdits() {
        const title = titleInput.value.trim();
        if (!title) { alert("Title is required."); return; }

        const tasksByDate = loadAllTasks();
        const key = dateKey(selectedDate);
        const tasks = tasksByDate[key] || [];

        const idx = tasks.findIndex(t => t.id === editingTaskId);
        if (idx === -1) return;

        tasks[idx].title = title;
        tasks[idx].notes = notesInput.value.trim();
        tasks[idx].priority = prioritySelect.value;
        tasks[idx].updatedAt = Date.now();

        saveAllTasks(tasksByDate);
        renderTasksForSelectedDate();

        showStatus("Task updated.", { closeAfter: true });
    }

    function deleteTask() {
        if (!editingTaskId) return;

        const tasksByDate = loadAllTasks();
        const key = dateKey(selectedDate);
        const tasks = tasksByDate[key] || [];

        tasksByDate[key] = tasks.filter(t => t.id !== editingTaskId);

        saveAllTasks(tasksByDate);
        renderTasksForSelectedDate();

        showStatus("Task deleted.", { closeAfter: true });
    }

    function clearStatus() {
        if (statusTimer) clearTimeout(statusTimer);
        statusTimer = null;
        statusEl.textContent = "";
    }

    function showStatus(message, { closeAfter = false} = {}) {
        statusEl.textContent = message;

        if (statusTimer) clearTimeout(statusTimer);
        statusTimer = setTimeout(() => {
            clearStatus();
            if (closeAfter) closeModal();
        }, STATUS_MS);
    }

    /* SORT */
    // helper methods
    function openSortPanel() {
        sortPanel.classList.remove("hidden");
    }

    function closeSortPanel() {
        sortPanel.classList.add("hidden");
    }

    closeSortPanel();

    function toggleSortPanel() {
        sortPanel.classList.toggle("hidden");
    }

    function isSortPanelOpen() {
        return !sortPanel.classList.contains("hidden");
    }

    function sortTasks(tasks, mode) {
        const copy = [...tasks]; // never mutate the original array

        const normalise = (s) => (s || "").trim().toLowerCase(); // small helper to normalise strings for consistent A-Z sorting

        const priorityRank = {high: 3, medium: 2, low: 1}; // priority ranking: highest should always come first

        switch (mode) {
            case "az":
                copy.sort((a, b) => normalise(a.title).localeCompare(normalise(b.title)));
                break;
            case "za":
                copy.sort((a, b) => normalise(b.title).localeCompare(normalise(a.title)));
                break;
            case "priority":
                copy.sort((a, b) => {
                    const pa = priorityRank[a.priority] || 0;
                    const pb = priorityRank[b.priority] || 0;

                    // higher priority first, where the tie breaker is the most recently created for priority clashes
                    if (pb !== pa) return pb - pa;
                    return (b.createdAt || 0) - (a.createdAt || 0);
                });
                break;
            case "lastUpdated":
                copy.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)); // most recently updated first. if no updatedAt exists, fall back to createdAt
                break;
            case "createdNewOld":
                copy.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                break;
            case "createdOldNew":
            default:
                copy.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
                break;
        }

        return copy;
    }

    function renderSortUI() {
        const buttons = sortOptionsEl.querySelectorAll(".sort-options");
        buttons.forEach(btn => {
            btn.classList.toggle("active", btn.dataset.sort === currentSortMode);
        });
    }

    /* SYSTEM SETTINGS */
    // helper methods
    function openSystemSettings() {
        closeSortPanel(); // close sort modal if its open

        backdrop.classList.remove("hidden");
        systemSettingsModal.classList.remove("hidden");
    }

    function closeSystemSettings() {
        systemSettingsModal.classList.add("hidden");

        const addTaskOpen = !modal.classList.contains("hidden");
        if (!addTaskOpen) {
            backdrop.classList.add("hidden");
        }
    }

    function setActiveTab(tabKey) {
        navButtons.forEach(btn => { // active button syling
            btn.classList.toggle("active", btn.dataset.tab === tabKey);
        });

        panels.forEach(panel => {
            panel.classList.toggle("hidden", panel.dataset.panel !== tabKey);
        });

        if (subtitle) {
            subtitle.textContent = tabKey.charAt(0).toUpperCase() + tabKey.slice(1);
        }
    }

    function setDarkMode(isOn) {
        document.body.classList.toggle("dark-mode", isOn);
        localStorage.setItem("darkMode", isOn ? "1" : "0");
    }

    /* EVENTS WIRING (Clicks) - so that specific actions are performed based on clicks: */
    addTaskBtn.addEventListener("click", openModal);
    deleteBtn.addEventListener("click", deleteTask);
    cancelBtn.addEventListener("click", closeModal);
    todayBtn.addEventListener("click", goToToday);
    previousBtn.addEventListener("click", () => changeDay(-1));
    nextBtn.addEventListener("click", () => changeDay(+1));

    // introduces logic that gives the "confirm" button uses other than just to add a task to a date. so now it handles for editing tasks, adding tasks, and deleting tasks
    confirmBtn.addEventListener("click", () => {
        if (editingTaskId) {
            saveEdits();
        } else {
            addTask();
        }
    });
    
    taskListEl.addEventListener("click", (e) => {
        const li = e.target.closest("li");
        if (!li) return;

        const taskId = Number(li.dataset.taskId);
        openEditModal(taskId);
    });

    // clicking the sort icon toggles the sort panel
    sortBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleSortPanel();
    });

    // prevent clicks *inside* the panel from closing it
    sortPanel.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    // close the sort panel when the user clicks anywhere else on the page
    document.addEventListener("click", () => {
        closeSortPanel();
    });

    sortSelect.addEventListener("change", () => {
        currentSortMode = sortSelect.value;
        localStorage.setItem("taskSortMode", currentSortMode);
        renderTasksForSelectedDate();
        closeSortPanel();
    });

    // System Settings wired up clicks
    systemSettingsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openSystemSettings();
    });

    backdrop.addEventListener("click", () => {
        closeModal(); // close whichever modal(s) are open
        closeSystemSettings();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        closeModal();
        closeSystemSettings();
        closeSortPanel();
    });

    navButtons.forEach(btn => {
        btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
    });

    setActiveTab("general"); // default tab when opening system settings modal

    if (darkToggle) {
        // load saved preference
        const saved = localStorage.getItem("darkMode") === "1";
        darkToggle.checked = saved;
        setDarkMode(saved);

        darkToggle.addEventListener("change", () => {
            setDarkMode(darkToggle.checked);
        });
    }

    renderDate(); // IMPORTANT: when the date changes, the tasks need to be re-rendered to avoid confusion
});
