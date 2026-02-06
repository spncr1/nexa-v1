const menuToggle = document.querySelector('.menu-toggle');
const navbar = document.querySelector('.navbar');

if (menuToggle && navbar) {
    menuToggle.addEventListener("click", () => {
        navbar.classList.toggle("open");
    });
}

document.addEventListener("DOMContentLoaded", () => {

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

        taskListEl.innerHTML = ""; // clears the old list

        tasks.forEach((t, index) => {
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

        // check to ensure array exists for that date
        if (!tasksByDate[key]) tasksByDate[key] = [];

        // create a task object (use THIS to iterate and add to this later for any other add task elements i may think are needed)
        const newTask = {
            id: Date.now(),
            title,
            notes,
            priority,
            done: false,
            createdAt: Date.now()
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

    /* EVENTS WIRING (Clicks) - so that specific actions are performed based on clicks: */
    addTaskBtn.addEventListener("click", openModal);
    deleteBtn.addEventListener("click", deleteTask);
    cancelBtn.addEventListener("click", closeModal);
    backdrop.addEventListener("click", closeModal);
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

    renderDate(); // IMPORTANT: when the date changes, the tasks need to be re-rendered to avoid confusion
});