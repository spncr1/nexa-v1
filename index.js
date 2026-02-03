// just gonna keep this simple to help at least get an idea for the dashboard

/* Date Buttons Interactivity */
const todayBtn = document.getElementById("today-btn");
const previousBtn = document.getElementById("previous-btn");
const nextBtn = document.getElementById("next-btn");

/* Date/Day Changes Interactivity */
const dateDisplay = document.getElementById("date-display");
const dayDisplay = document.getElementById("day-display");

// Load the last selected date from localStorage (so that when you referesh, you keep your place)
const savedDate = localStorage.getItem("selectedDate");

// IF there is a saved date, use it. Otherwise default to today.
let selectedDate = savedDate ? new Date(savedDate) : new Date();

// Normalise the time to midday to avoid timezone issues
selectedDate.setHours(12, 0, 0, 0);

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

    localStorage.getItem("selectedDate", selectedDate.toISOString()); // save the selected date so that refreshing the page doesn't reset it
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

/* EVENTS WIRING (Clicks): */
todayBtn.addEventListener("click", goToToday);
previousBtn.addEventListener("click", () => changeDay(-1));
nextBtn.addEventListener("click", () => changeDay(+1));

renderDate();

// the code i used to create my hamburger-style navbar for an older version of my personal website. will need some tweaking and i don't understand all of it just yet, but this can give me an idea on how i could do it
const menuToggle = document.querySelector('.menu-toggle');
const navbar = document.querySelector('.navbar');

if (menuToggle && navbar) {
    menuToggle.addEventListener("click", () => {
        navbar.classList.toggle("open");
    });
}

// TODAY'S TASKS (connecting to HTML)
/* variables definition */
const addTaskBtn = document.getElementById("add-task-btn");
const backdrop = document.getElementById("modal-backdrop");
const modal = document.getElementById("add-task-modal");

const titleInput = document.getElementById("task-title");
const notesInput = document.getElementById("task-notes");
const prioritySelect = document.getElementById("task-priority");

const cancelBtn = document.getElementById("cancel-task-btn");
const confirmBtn = document.getElementById("confirm-task-btn");

const taskListEl = document.getElementById("task-list");
const statusEl = document.getElementById("task-status");

// converts selectedDate to YYYY-MM-DD
function dateKey(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// load/save tasks object from localStorage
function loadAllTasks() {
    const raw = localStorage.setItem("tasksByDate");
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
        taskListEl.appendChild(li);
    });
}

/* modal open/close */
function openModal() {
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

// ADD TASK TO TASK LIST FOR SELECTED DATE
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

    statusEl.textContent = "Task successfully added.";
    renderTasksForSelectedDate();
    
    setTimeout(() => {
        statusEl.textContent = "";
        closeModal();
    }, 700);
    
    
}

// Wiring up clicks, so that specific actions are performed based on clicks
addTaskBtn.addEventListener("click", openModal);
cancelBtn.addEventListener("click", closeModal);
backdrop.addEventListener("click", closeModal);
confirmBtn.addEventListener("click", addTask);

// IMPORTANT: when the date changes, the tasks need to be re-rendered to avoid confusion
//renderTasksForSelectedDate();