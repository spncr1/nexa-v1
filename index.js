document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.querySelector(".menu-toggle");
    const NAV_COLLAPSED_KEY = "studenthub_nav_collapsed";
    const mobileNavQuery = window.matchMedia("(max-width: 768px)");

    function setNavCollapsed(isCollapsed) {
        document.body.classList.toggle("nav-collapsed", isCollapsed);
        localStorage.setItem(NAV_COLLAPSED_KEY, isCollapsed ? "1" : "0");
        if (menuToggle) {
            menuToggle.setAttribute("aria-expanded", (!isCollapsed).toString());
        }
    }

    if (menuToggle) {
        const savedCollapsed = localStorage.getItem(NAV_COLLAPSED_KEY) === "1";
        setNavCollapsed(mobileNavQuery.matches ? true : savedCollapsed);
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
    const taskEmptyTemplate = document.getElementById("task-empty-template");
    const todayTasksCard = document.querySelector(".today-tasks");
    const assignmentsDueCard = document.querySelector(".assignments-due");
    const assignmentsDueListEl = document.getElementById("assignments-due-list");
    const assignmentsDueMoreEl = document.getElementById("assignments-due-more");
    const assignmentDueItemTemplate = document.getElementById("assignment-due-item-template");
    const assignmentDueEmptyTemplate = document.getElementById("assignment-due-empty-template");
    const upcomingAssignmentsListEl = document.getElementById("upcoming-assignments-list");
    const upcomingAssignmentItemTemplate = document.getElementById("upcoming-assignment-item-template");
    const upcomingAssignmentEmptyTemplate = document.getElementById("upcoming-assignment-empty-template");
    const upcomingAssignmentsWidget = document.querySelector(".upcoming-assignments-widget");
    const calendarMonthLabelEl = document.getElementById("calendar-month-label");
    const calendarDaysEl = document.getElementById("calendar-days");
    const calendarPrevMonthBtn = document.getElementById("calendar-prev-month");
    const calendarNextMonthBtn = document.getElementById("calendar-next-month");

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
    const resetAppDataBtn = document.getElementById("reset-app-data-btn");
    const loadDemoDataBtn = document.getElementById("load-demo-data-btn");
    const accountNameInput = document.getElementById("account-name-input");
    const accountSemesterInput = document.getElementById("account-semester-input");
    const saveAccountBtn = document.getElementById("save-account-btn");

    let selectedDate = new Date();

    // Normalise the time to midday to avoid timezone issues
    selectedDate.setHours(12, 0, 0, 0);
    let calendarViewDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12, 0, 0, 0);

    let editingTaskId = null;
    const TASKS_KEY = "tasksByDate";
    const ASSIGNMENTS_KEY = "studenthub_assignments";
    const SUBJECTS_KEY = "studenthub_subjects";
    const USER_NAME_KEY = "studenthub_user_name";
    const SEMESTER_KEY = "studenthub_semester_label";
    const DEFAULT_USER_NAME = "Student";
    const DEFAULT_SEMESTER_LABEL = "Autumn Session 2026";
    const APP_DATA_KEYS = [TASKS_KEY, SUBJECTS_KEY, ASSIGNMENTS_KEY, USER_NAME_KEY, SEMESTER_KEY];
    const ASSIGNMENTS_PREVIEW_LIMIT = 2;
    const UPCOMING_ASSIGNMENTS_LIMIT = 3;

    const STATUS_MS = 1500;
    let statusTimer = null;

    function loadUserName() {
        const saved = localStorage.getItem(USER_NAME_KEY);
        return saved && saved.trim() ? saved : DEFAULT_USER_NAME;
    }

    function loadSemesterLabel() {
        const saved = localStorage.getItem(SEMESTER_KEY);
        return saved && saved.trim() ? saved : DEFAULT_SEMESTER_LABEL;
    }

    function renderUserName() {
        const el = document.getElementById("welcome-name");
        if (el) {
            el.textContent = loadUserName();
        }
    }

    function renderSemesterLabel() {
        const labels = document.querySelectorAll(".semester-label");
        if (!labels.length) return;
        labels.forEach((el) => {
            el.textContent = `(${loadSemesterLabel()})`;
        });
    }

    function populateAccountInputs() {
        if (accountNameInput) {
            accountNameInput.value = loadUserName();
        }
        if (accountSemesterInput) {
            accountSemesterInput.value = loadSemesterLabel();
        }
    }

    function saveAccountSettings() {
        const nameValue = (accountNameInput?.value || "").trim() || DEFAULT_USER_NAME;
        const semesterValue = (accountSemesterInput?.value || "").trim() || DEFAULT_SEMESTER_LABEL;

        localStorage.setItem(USER_NAME_KEY, nameValue);
        localStorage.setItem(SEMESTER_KEY, semesterValue);

        renderUserName();
        renderSemesterLabel();
        populateAccountInputs();
    }

    // converts selectedDate to YYYY-MM-DD
    function dateKey(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, "0");
        const d = String(dateObj.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    // load/save tasks object from localStorage
    function loadAllTasks() {
        try {
            const raw = localStorage.getItem(TASKS_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (e) {
            console.warn("Failed to parse tasks:", e);
            return {};
        }
    }

    function loadAssignments() {
        try {
            const raw = localStorage.getItem(ASSIGNMENTS_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn("Failed to parse assignments:", e);
            return [];
        }
    }

    function loadSubjectsMap() {
        try {
            const raw = localStorage.getItem(SUBJECTS_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed)) return new Map();

            return new Map(
                parsed
                    .filter((s) => s && typeof s.id === "string" && typeof s.name === "string")
                    .map((s) => [s.id, s.name])
            );
        } catch (e) {
            console.warn("Failed to parse subjects:", e);
            return new Map();
        }
    }

    function saveAllTasks(tasksByDate) {
        localStorage.setItem(TASKS_KEY, JSON.stringify(tasksByDate));
    }

    // render tasks for the currently selected date
    function renderTasksForSelectedDate() {
        const tasksByDate = loadAllTasks();
        const key = dateKey(selectedDate);
        const tasks = tasksByDate[key] || [];

        const sortedTasks = sortTasks(tasks, currentSortMode); // apply the currently selected sort mode (front-end only for now, more backend logic to be implemented)
        
        taskListEl.innerHTML = ""; // clears the old list

        if (!sortedTasks.length) {
            if (!taskEmptyTemplate) return;
            taskListEl.appendChild(taskEmptyTemplate.content.firstElementChild.cloneNode(true));
            updateHomeOverflowHints();
            return;
        }

        sortedTasks.forEach((t) => {
            const li = document.createElement("li");
            li.className = "task-list-item";
            li.textContent = `${t.title} (${t.priority})`;
            li.dataset.taskId = t.id; // attach the task id to the element (so clicks can find the correct task)
            taskListEl.appendChild(li);
        });

        updateHomeOverflowHints();
    }

    function isSameCalendarDay(a, b) {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    }

    function toLabelCase(value) {
        return (value || "")
            .toString()
            .trim()
            .split("-")
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
    }

    function priorityRank(priority) {
        const ranks = { high: 3, medium: 2, low: 1 };
        return ranks[(priority || "").toLowerCase()] || 0;
    }

    function dateAtNoon(year, month, day) {
        const d = new Date(year, month, day);
        d.setHours(12, 0, 0, 0);
        return d;
    }

    function parseISODate(iso) {
        if (!iso) return null;
        const d = new Date(`${iso}T00:00:00`);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    function getTodayAtNoon() {
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        return today;
    }

    function getDaysUntil(targetDate, fromDate) {
        return Math.round((targetDate - fromDate) / 86400000);
    }

    function getAssignmentDetailsHref(assignmentId) {
        // I want both home-page assignment card types to open the exact same
        // assignment target, so the deep-link path lives in one place.
        return `/client/features/Assignments/assignments.html?assignmentId=${encodeURIComponent(assignmentId)}`;
    }

    function formatCalendarMonthYear(dateObj) {
        return dateObj.toLocaleString("en-AU", { month: "long", year: "numeric" }).toUpperCase();
    }

    function getCalendarAssignmentsByDate() {
        const subjectsMap = loadSubjectsMap();
        const assignmentsByDate = new Map();

        loadAssignments().forEach((assignment) => {
            const iso = (assignment?.dueDate || "").trim();
            if (!iso) return;

            const entries = assignmentsByDate.get(iso) || [];
            entries.push({
                id: assignment.id,
                task: (assignment.task || "").trim() || "Assignment",
                subject: subjectsMap.get(assignment.courseId) || "Unknown subject"
            });
            assignmentsByDate.set(iso, entries);
        });

        return assignmentsByDate;
    }

    function createCalendarTooltip(assignments) {
        const tooltip = document.createElement("div");
        tooltip.className = "calendar-day-tooltip";

        assignments.forEach((assignment) => {
            const item = document.createElement("div");
            item.className = "calendar-day-tooltip-item";

            const task = document.createElement("div");
            task.className = "calendar-day-tooltip-task";
            task.textContent = assignment.task;

            const subject = document.createElement("div");
            subject.className = "calendar-day-tooltip-subject";
            subject.textContent = assignment.subject;

            item.appendChild(task);
            item.appendChild(subject);
            tooltip.appendChild(item);
        });

        return tooltip;
    }

    function renderCalendarWidget() {
        if (!calendarMonthLabelEl || !calendarDaysEl) return;

        const viewYear = calendarViewDate.getFullYear();
        const viewMonth = calendarViewDate.getMonth();
        const firstOfMonth = dateAtNoon(viewYear, viewMonth, 1);
        const monthStartOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first calendar
        const gridStart = dateAtNoon(viewYear, viewMonth, 1 - monthStartOffset);
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const assignmentsByDate = getCalendarAssignmentsByDate();

        calendarMonthLabelEl.textContent = formatCalendarMonthYear(calendarViewDate);
        calendarDaysEl.innerHTML = "";

        for (let i = 0; i < 42; i += 1) {
            const cellDate = dateAtNoon(
                gridStart.getFullYear(),
                gridStart.getMonth(),
                gridStart.getDate() + i
            );

            const dayCell = document.createElement("div");
            dayCell.className = "calendar-day-cell";

            const dayBtn = document.createElement("button");
            dayBtn.type = "button";
            dayBtn.className = "calendar-day";
            dayBtn.textContent = String(cellDate.getDate());
            dayBtn.dataset.iso = dateKey(cellDate);
            dayBtn.setAttribute("role", "gridcell");
            dayBtn.setAttribute("aria-label", cellDate.toLocaleDateString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }));

            if (cellDate.getMonth() !== viewMonth) {
                dayBtn.classList.add("outside-month");
            }
            if (isSameCalendarDay(cellDate, today)) {
                dayBtn.classList.add("is-today");
            }
            if (isSameCalendarDay(cellDate, selectedDate)) {
                dayBtn.classList.add("selected");
                dayBtn.setAttribute("aria-selected", "true");
            } else {
                dayBtn.setAttribute("aria-selected", "false");
            }

            dayBtn.addEventListener("click", () => {
                selectedDate = new Date(cellDate);
                selectedDate.setHours(12, 0, 0, 0);
                calendarViewDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12, 0, 0, 0);
                renderDate();
            });

            dayCell.appendChild(dayBtn);

            const assignments = assignmentsByDate.get(dayBtn.dataset.iso) || [];
            if (assignments.length) {
                // From my POV, the calendar dots should quietly hint at due work,
                // then let the hover details do the heavier lifting when needed.
                const dots = document.createElement("div");
                dots.className = "calendar-day-dots";

                for (let dotIndex = 0; dotIndex < Math.min(assignments.length, 3); dotIndex += 1) {
                    const dot = document.createElement("span");
                    dot.className = "calendar-day-dot";
                    dots.appendChild(dot);
                }

                dayCell.appendChild(dots);
                dayCell.appendChild(createCalendarTooltip(assignments));
            }

            calendarDaysEl.appendChild(dayCell);
        }
    }

    function renderAssignmentsDueForSelectedDate() {
        if (!assignmentsDueListEl || !assignmentsDueMoreEl) return;

        const key = dateKey(selectedDate);
        const assignments = loadAssignments()
            .filter((a) => a && typeof a.task === "string" && a.dueDate === key)
            .sort((a, b) => {
                const prioDiff = priorityRank(b.priority) - priorityRank(a.priority);
                if (prioDiff !== 0) return prioDiff;
                return (b.createdAt || 0) - (a.createdAt || 0);
            });

        const subjectsMap = loadSubjectsMap();
        const isSelectedRealToday = isSameCalendarDay(selectedDate, new Date());

        assignmentsDueListEl.innerHTML = "";
        assignmentsDueMoreEl.textContent = "";
        assignmentsDueMoreEl.classList.add("hidden");

        if (!assignments.length) {
            if (!assignmentDueEmptyTemplate) return;
            assignmentsDueListEl.appendChild(assignmentDueEmptyTemplate.content.firstElementChild.cloneNode(true));
            return;
        }

        const previewItems = assignments.slice(0, ASSIGNMENTS_PREVIEW_LIMIT);

        previewItems.forEach((assignment) => {
            if (!assignmentDueItemTemplate) return;

            const li = assignmentDueItemTemplate.content.firstElementChild.cloneNode(true);
            const titleEl = li.querySelector(".assignment-due-task");
            const subjectEl = li.querySelector(".assignment-due-subject");
            const dueTextEl = li.querySelector(".assignment-due-date-label");
            const priorityDotEl = li.querySelector(".assignment-priority-dot");
            const priorityLabelEl = li.querySelector(".assignment-priority-label");
            const statusLabelEl = li.querySelector(".assignment-status-label");

            if (titleEl) titleEl.textContent = assignment.task.trim() || "Assignment";
            if (subjectEl) subjectEl.textContent = subjectsMap.get(assignment.courseId) || "Unknown subject";
            if (dueTextEl) dueTextEl.textContent = isSelectedRealToday ? "Due today" : `Due ${formatFullDate(selectedDate)}`;
            if (priorityLabelEl) priorityLabelEl.textContent = toLabelCase(assignment.priority) || "Medium";
            if (statusLabelEl) statusLabelEl.textContent = toLabelCase(assignment.status) || "Not Started";

            if (priorityDotEl) {
                priorityDotEl.classList.remove("priority-high", "priority-medium", "priority-low");
                const className = `priority-${(assignment.priority || "").toLowerCase()}`;
                priorityDotEl.classList.add(className);
            }

            li.dataset.assignmentId = assignment.id;
            li.setAttribute("role", "link");
            li.setAttribute("tabindex", "0");
            li.setAttribute(
                "aria-label",
                `${assignment.task || "Assignment"}, due ${isSelectedRealToday ? "today" : formatFullDate(selectedDate)}`
            );

            assignmentsDueListEl.appendChild(li);
        });

        const remaining = assignments.length - previewItems.length;
        if (remaining > 0) {
            assignmentsDueMoreEl.textContent = `+${remaining} more on Assignments page`;
            assignmentsDueMoreEl.classList.remove("hidden");
        }
    }

    function renderUpcomingAssignmentsWidget() {
        if (!upcomingAssignmentsListEl) return;

        // This is designed to stay tied to the real upcoming due dates synced with the date they are given when created in the assignments page (or when randomly generated from system settings)
        const today = getTodayAtNoon();
        const subjectsMap = loadSubjectsMap();

        const upcomingAssignments = loadAssignments()
            .map((assignment) => ({
                ...assignment,
                dueDateObj: parseISODate(assignment.dueDate)
            }))
            .filter((assignment) =>
                assignment &&
                typeof assignment.task === "string" &&
                assignment.dueDateObj &&
                assignment.dueDateObj >= today
            )
            .sort((a, b) => {
                const dueDateDiff = a.dueDateObj - b.dueDateObj;
                if (dueDateDiff !== 0) return dueDateDiff;

                const prioDiff = priorityRank(b.priority) - priorityRank(a.priority);
                if (prioDiff !== 0) return prioDiff;

                return (b.createdAt || 0) - (a.createdAt || 0);
            })
            .slice(0, UPCOMING_ASSIGNMENTS_LIMIT);

        upcomingAssignmentsListEl.innerHTML = "";

        if (!upcomingAssignments.length) {
            if (!upcomingAssignmentEmptyTemplate) return;
            upcomingAssignmentsListEl.appendChild(
                upcomingAssignmentEmptyTemplate.content.firstElementChild.cloneNode(true)
            );
            updateHomeOverflowHints();
            return;
        }

        upcomingAssignments.forEach((assignment) => {
            if (!upcomingAssignmentItemTemplate) return;

            const item = upcomingAssignmentItemTemplate.content.firstElementChild.cloneNode(true);
            const linkEl = item.querySelector(".upcoming-assignment-link");
            const dueInLabelEl = item.querySelector(".upcoming-assignment-prefix");
            const daysValueEl = item.querySelector(".upcoming-assignment-days-value");
            const daysLabelEl = item.querySelector(".upcoming-assignment-days-label");
            const taskEl = item.querySelector(".upcoming-assignment-task");
            const subjectEl = item.querySelector(".upcoming-assignment-subject");
            const dueDateEl = item.querySelector(".upcoming-assignment-due-date");
            const daysUntil = getDaysUntil(assignment.dueDateObj, today);

            if (linkEl) {
                // Clicking an upcoming card should take the user straight to the exact assignment it came from
                linkEl.href = getAssignmentDetailsHref(assignment.id);
                linkEl.setAttribute(
                    "aria-label",
                    `${assignment.task || "Assignment"}, due ${formatFullDate(assignment.dueDateObj)}`
                );
            }

            // Structured such that it reads like a stacked mini "big day countdown" counter:
            if (daysValueEl) daysValueEl.textContent = String(daysUntil);
            if (daysLabelEl) daysLabelEl.textContent = daysUntil === 1 ? "DAY" : "DAYS";
            if (taskEl) taskEl.textContent = assignment.task.trim() || "Assignment";
            if (subjectEl) subjectEl.textContent = subjectsMap.get(assignment.courseId) || "Unknown subject";

            upcomingAssignmentsListEl.appendChild(item);
        });

        updateHomeOverflowHints();
    }

    function updateHomeOverflowHints() {
        // I want this to match the working subjects list behaviour:
        // only show the fade if the inner list actually has content hidden below.
        if (todayTasksCard && taskListEl) {
            const tasksCanScroll = taskListEl.scrollHeight > taskListEl.clientHeight + 1;
            todayTasksCard.classList.toggle("has-more", tasksCanScroll);
        }

        if (upcomingAssignmentsWidget && upcomingAssignmentsListEl) {
            const upcomingCanScroll = upcomingAssignmentsListEl.scrollHeight > upcomingAssignmentsListEl.clientHeight + 1;
            upcomingAssignmentsWidget.classList.toggle("has-more", upcomingCanScroll);
        }
    }

    /* helper functions for dates */
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
        calendarViewDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12, 0, 0, 0);

        renderTasksForSelectedDate(); // keeps tasks synced with the displayed date
        renderAssignmentsDueForSelectedDate();
        renderUpcomingAssignmentsWidget();
        renderCalendarWidget();
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

    function changeCalendarMonth(amount) {
        // From my POV, month arrows should browse the widget first,
        // and only change the main selected date once the user clicks a specific day.
        calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + amount, 1, 12, 0, 0, 0);
        renderCalendarWidget();
    }

    /* modal open/close */
    function openModal() {
        editingTaskId = null; // force add-mode
        
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

    /* SYSTEM SETTINGS */
    // helper methods
    function openSystemSettings() {

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

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function pick(list) {
        return list[randomInt(0, list.length - 1)];
    }

    function hasAnyAppData() {
        return APP_DATA_KEYS.some((key) => {
            const raw = localStorage.getItem(key);
            if (raw === null || raw.trim() === "") return false;

            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed.length > 0;
                if (parsed && typeof parsed === "object") return Object.keys(parsed).length > 0;
                return true;
            } catch {
                return true;
            }
        });
    }

    function formatISODate(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, "0");
        const d = String(dateObj.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    function generateDemoTasksByDate() {
        const titles = [
            "Review lecture notes",
            "Gym session",
            "Finish quiz practice",
            "Group meeting",
            "Draft weekly plan",
            "Read chapter 4",
            "Prepare lab notes",
            "Submit discussion post",
            "Revise formulas",
            "Practice coding",
            "Watch tutorial",
            "Clean up inbox"
        ];
        const notes = [
            "Focus on key outcomes.",
            "Keep this under one hour.",
            "Track progress in checklist.",
            "Prioritize this before dinner."
        ];
        const priorities = ["low", "medium", "high"];
        const baseDate = new Date();
        baseDate.setHours(12, 0, 0, 0);

        const tasksByDate = {};
        const totalTasks = randomInt(16, 28);
        const now = Date.now();

        for (let i = 0; i < totalTasks; i += 1) {
            const dateObj = new Date(baseDate);
            dateObj.setDate(baseDate.getDate() + randomInt(-10, 40));
            const key = dateKey(dateObj);

            const task = {
                id: now + i,
                title: pick(titles),
                notes: pick(notes),
                priority: pick(priorities),
                done: false,
                createdAt: now - randomInt(0, 8) * 86400000,
                updatedAt: now - randomInt(0, 3) * 3600000
            };

            if (!Array.isArray(tasksByDate[key])) {
                tasksByDate[key] = [];
            }
            tasksByDate[key].push(task);
        }

        return tasksByDate;
    }

    function generateDemoAssignmentsData() {
        const subjectPool = [
            "Stochastic Processes",
            "Nonlinear Dynamics and Chaos",
            "Quantum Mechanics II",
            "Advanced Organic Synthesis",
            "Genomics and Bioinformatics",
            "Neuropsychology",
            "Behavioural Economics",
            "Game Theory",
            "Derivative Securities",
            "Corporate Taxation Law",
            "International Trade Law",
            "Postcolonial Literature",
            "Philosophy of Mind",
            "Ethics of Artificial Intelligence",
            "Digital Signal Processing",
            "Embedded Systems Design",
            "Distributed Systems",
            "Compiler Construction",
            "Advanced Database Systems",
            "Network Security",
            "Penetration Testing",
            "Cloud Architecture",
            "Big Data Analytics",
            "Reinforcement Learning",
            "Computer Vision",
            "Natural Language Processing",
            "Human-Centred Design",
            "Interaction Design Studio",
            "Urban Sustainability",
            "Climate Change Modelling",
            "Biomechanics",
            "Exercise Physiology",
            "Curriculum Design and Assessment",
            "Second Language Acquisition",
            "Film Theory and Criticism",
            "Sound Design",
            "Game Design Studio",
            "Entrepreneurial Finance",
            "Innovation Management",
            "Supply Chain Analytics"
        ];
        const taskPool = [
            "Quiz",
            "Lab Report",
            "Case Study",
            "Team Presentation",
            "Project Milestone",
            "Final Exam",
            "Reflection",
            "Research Summary"
        ];
        const descPool = [
            "Draft and submit a concise response with key references.",
            "Apply the weekly concepts and include screenshots/evidence.",
            "Demonstrate the workflow and explain design choices.",
            "Collaborate with your group and document outcomes."
        ];
        const priorities = ["low", "medium", "high"];
        const statuses = ["not-started", "in-progress", "completed"];
        const now = Date.now();
        const today = new Date();
        const subjectCount = randomInt(4, 5);
        const subjects = [];
        const assignments = [];
        const shuffledSubjects = [...subjectPool].sort(() => Math.random() - 0.5).slice(0, subjectCount);

        shuffledSubjects.forEach((name, subjectIndex) => {
            const subjectId = `subject_demo_${now}_${subjectIndex}`;
            subjects.push({
                id: subjectId,
                name,
                createdAt: now - subjectIndex * 1000,
                updatedAt: now - subjectIndex * 1000
            });

            const assignmentCount = randomInt(1, 5);
            const weightingTemplates = {
                1: [[100]],
                2: [[50, 50], [40, 60], [30, 70]],
                3: [[20, 30, 50], [25, 25, 50], [30, 30, 40], [20, 40, 40]],
                4: [[25, 25, 25, 25], [20, 20, 20, 40], [10, 20, 30, 40], [15, 20, 25, 40]],
                5: [[10, 15, 20, 25, 30], [10, 20, 20, 20, 30], [15, 15, 20, 25, 25], [10, 10, 20, 30, 30]]
            };

            function shuffleArray(arr) {
                return [...arr].sort(() => Math.random() - 0.5);
            }

            function pickWeightings(count) {
                const templates = weightingTemplates[count];
                const chosen = pick(templates);
                return shuffleArray(chosen);
            }

            const weightings = pickWeightings(assignmentCount);

            for (let i = 0; i < assignmentCount; i += 1) {
                const dueDate = new Date(today);
                dueDate.setDate(today.getDate() + randomInt(2, 120));
                const taskType = pick(taskPool);

                assignments.push({
                    id: `assignment_demo_${now}_${subjectIndex}_${i}`,
                    courseId: subjectId,
                    task: `${taskType} ${i + 1}`,
                    description: pick(descPool),
                    priority: pick(priorities),
                    status: pick(statuses),
                    dueDate: formatISODate(dueDate),
                    weighting: Number(weightings[i].toFixed(1)),
                    createdAt: now - randomInt(0, 10) * 86400000,
                    updatedAt: now - randomInt(0, 3) * 3600000
                });
            }
        });

        return { subjects, assignments };
    }

    function resetAllAppData() {
        if (!hasAnyAppData()) {
            alert("No app data to reset.");
            return;
        }

        const confirmed = window.confirm(
            "Reset all app data? This will permanently delete all saved tasks, subjects, and assignments across the application."
        );
        if (!confirmed) return;

        APP_DATA_KEYS.forEach((key) => localStorage.removeItem(key));
        editingTaskId = null;
        selectedDate = new Date();
        selectedDate.setHours(12, 0, 0, 0);
        renderUserName();
        renderSemesterLabel();
        populateAccountInputs();
        renderDate();
    }

    function loadAllDemoData() {
        const demoTasks = generateDemoTasksByDate();
        const demoAssignments = generateDemoAssignmentsData();

        localStorage.setItem(TASKS_KEY, JSON.stringify(demoTasks));
        localStorage.setItem(SUBJECTS_KEY, JSON.stringify(demoAssignments.subjects));
        localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(demoAssignments.assignments));
        localStorage.setItem(USER_NAME_KEY, "Demo Student");
        localStorage.setItem(SEMESTER_KEY, DEFAULT_SEMESTER_LABEL);

        editingTaskId = null;
        selectedDate = new Date();
        selectedDate.setHours(12, 0, 0, 0);
        renderUserName();
        renderSemesterLabel();
        populateAccountInputs();
        renderDate();
    }

    /* EVENTS WIRING (Clicks) - so that specific actions are performed based on clicks: */
    addTaskBtn.addEventListener("click", openModal);
    deleteBtn.addEventListener("click", deleteTask);
    cancelBtn.addEventListener("click", closeModal);
    todayBtn.addEventListener("click", goToToday);
    previousBtn.addEventListener("click", () => changeDay(-1));
    nextBtn.addEventListener("click", () => changeDay(+1));
    calendarPrevMonthBtn?.addEventListener("click", () => changeCalendarMonth(-1));
    calendarNextMonthBtn?.addEventListener("click", () => changeCalendarMonth(1));

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

    assignmentsDueListEl?.addEventListener("click", (e) => {
        const item = e.target.closest(".assignment-due-item");
        if (!item?.dataset.assignmentId) return;
        window.location.href = getAssignmentDetailsHref(item.dataset.assignmentId);
    });

    assignmentsDueListEl?.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const item = e.target.closest(".assignment-due-item");
        if (!item?.dataset.assignmentId) return;
        e.preventDefault();
        window.location.href = getAssignmentDetailsHref(item.dataset.assignmentId);
    });

    sortSelect.addEventListener("change", () => {
        currentSortMode = sortSelect.value;
        localStorage.setItem("taskSortMode", currentSortMode);
        renderTasksForSelectedDate();
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
    });

    navButtons.forEach(btn => {
        btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
    });

    setActiveTab("general"); // default tab when opening system settings modal

    if (assignmentsDueCard) {
        assignmentsDueCard.setAttribute("role", "button");
        assignmentsDueCard.setAttribute("tabindex", "0");
    }

    if (darkToggle) {
        // load saved preference
        const saved = localStorage.getItem("darkMode") === "1";
        darkToggle.checked = saved;
        setDarkMode(saved);

        darkToggle.addEventListener("change", () => {
            setDarkMode(darkToggle.checked);
        });
    }

    if (resetAppDataBtn) {
        resetAppDataBtn.addEventListener("click", resetAllAppData);
    }

    if (loadDemoDataBtn) {
        loadDemoDataBtn.addEventListener("click", loadAllDemoData);
    }

    if (saveAccountBtn) {
        saveAccountBtn.addEventListener("click", saveAccountSettings);
    }

    taskListEl?.addEventListener("scroll", updateHomeOverflowHints);
    upcomingAssignmentsListEl?.addEventListener("scroll", updateHomeOverflowHints);
    window.addEventListener("resize", updateHomeOverflowHints);

    renderUserName();
    renderSemesterLabel();
    populateAccountInputs();
    renderDate(); // IMPORTANT: when the date changes, the tasks need to be re-rendered to avoid confusion
});
