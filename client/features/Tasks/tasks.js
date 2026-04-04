document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.querySelector(".menu-toggle");
    const NAV_COLLAPSED_KEY = "studenthub_nav_collapsed";
    const mobileNavQuery = window.matchMedia("(max-width: 768px)");
    const TASKS_KEY = "tasksByDate";
    const SUBJECTS_KEY = "studenthub_subjects";
    const ASSIGNMENTS_KEY = "studenthub_assignments";
    const USER_NAME_KEY = "studenthub_user_name";
    const SEMESTER_KEY = "studenthub_semester_label";
    const DEFAULT_USER_NAME = "Student";
    const DEFAULT_SEMESTER_LABEL = "Autumn Session 2026";
    const APP_DATA_KEYS = [TASKS_KEY, SUBJECTS_KEY, ASSIGNMENTS_KEY, USER_NAME_KEY, SEMESTER_KEY];

    const todayBtn = document.getElementById("today-btn");
    const previousBtn = document.getElementById("previous-btn");
    const nextBtn = document.getElementById("next-btn");
    const weekViewBtn = document.getElementById("week-view-btn");
    const monthViewBtn = document.getElementById("month-view-btn");
    const rangeLabelEl = document.getElementById("tasks-range-label");

    const weekViewEl = document.getElementById("tasks-week-view");
    const monthViewEl = document.getElementById("tasks-month-view");

    const weekHeaderEl = document.getElementById("tasks-week-header");
    const weekBodyEl = document.getElementById("tasks-week-body");
    const weekTimeRailEl = document.getElementById("tasks-week-time-rail");
    const weekSlotTemplate = document.getElementById("week-slot-template");

    const monthDaysEl = document.getElementById("tasks-month-days");
    const monthBodyEl = document.getElementById("tasks-month-body");
    const monthTimeRailEl = document.getElementById("tasks-month-time-rail");
    const selectedDateLabelEl = document.getElementById("tasks-selected-date-label");

    const backdrop = document.getElementById("modal-backdrop");
    const modal = document.getElementById("add-task-modal");
    const modalTitleEl = document.getElementById("task-modal-title");
    const scheduleContextEl = document.getElementById("task-schedule-context");
    const titleInput = document.getElementById("task-title");
    const notesInput = document.getElementById("task-notes");
    const prioritySelect = document.getElementById("task-priority");
    const timeInput = document.getElementById("task-time");
    const statusEl = document.getElementById("task-status");
    const cancelBtn = document.getElementById("cancel-task-btn");
    const deleteBtn = document.getElementById("delete-task-btn");
    const confirmBtn = document.getElementById("confirm-task-btn");

    const systemSettingsBtn = document.getElementById("system-settings-btn");
    const systemSettingsModal = document.getElementById("system-settings-modal");
    const navButtons = document.querySelectorAll(".settings-nav");
    const panels = document.querySelectorAll(".settings-panel");
    const subtitle = document.getElementById("settings-subtitle");
    const darkToggle = document.getElementById("dark-mode-toggle");
    const resetAppDataBtn = document.getElementById("reset-app-data-btn");
    const loadDemoDataBtn = document.getElementById("load-demo-data-btn");
    const accountNameInput = document.getElementById("account-name-input");
    const accountSemesterInput = document.getElementById("account-semester-input");
    const saveAccountBtn = document.getElementById("save-account-btn");

    let viewMode = "week";
    let activeDate = atNoon(new Date());
    let selectedMonthDate = atNoon(new Date());
    let editingTaskId = null;
    let modalDateKey = "";
    let modalHour = null;
    let dragPayload = null;

    function atNoon(value) {
        const d = value instanceof Date ? new Date(value) : new Date(value);
        d.setHours(12, 0, 0, 0);
        return d;
    }

    function dateKey(dateObj) {
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
    }

    function dateFromKey(key) {
        const [year, month, day] = key.split("-").map(Number);
        return atNoon(new Date(year, month - 1, day));
    }

    function setNavCollapsed(isCollapsed) {
        document.body.classList.toggle("nav-collapsed", isCollapsed);
        localStorage.setItem(NAV_COLLAPSED_KEY, isCollapsed ? "1" : "0");
        if (menuToggle) {
            menuToggle.setAttribute("aria-expanded", (!isCollapsed).toString());
        }
    }

    function startOfWeekMonday(dateObj) {
        const date = atNoon(dateObj);
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        date.setDate(date.getDate() + diff);
        return date;
    }

    function sameDay(a, b) {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    }

    function hourLabel(hour24) {
        const suffix = hour24 < 12 ? "AM" : "PM";
        const displayHour = hour24 % 12 === 0 ? 12 : hour24 % 12;
        return `${displayHour} ${suffix}`;
    }

    function hourToTimeInput(hour24) {
        return `${String(hour24).padStart(2, "0")}:00`;
    }

    function normalizeTimeInput(value) {
        if (!value || typeof value !== "string") return null;
        const [hourStr, minuteStr] = value.split(":");
        const hour = Number(hourStr);
        const minute = Number(minuteStr);
        if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
        if (hour < 0 || hour > 23) return null;
        if (minute < 0 || minute > 59) return null;
        return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }

    function parseHourFromTimeInput(value) {
        const normalized = normalizeTimeInput(value);
        if (!normalized) return null;
        const [hours] = normalized.split(":");
        const hour = Number(hours);
        return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
    }

    function parseMinuteFromTimeInput(value) {
        const normalized = normalizeTimeInput(value);
        if (!normalized) return null;
        return Number(normalized.split(":")[1]);
    }

    function getTaskTimeParts(task) {
        if (typeof task.scheduledTime === "string") {
            const normalized = normalizeTimeInput(task.scheduledTime);
            if (normalized) {
                const [h, m] = normalized.split(":");
                return { hour: Number(h), minute: Number(m), normalized };
            }
        }

        if (Number.isInteger(task.scheduledHour) && task.scheduledHour >= 0 && task.scheduledHour <= 23) {
            return {
                hour: task.scheduledHour,
                minute: 0,
                normalized: hourToTimeInput(task.scheduledHour)
            };
        }

        return null;
    }

    function quarterIndexFromMinute(minute) {
        if (!Number.isInteger(minute) || minute < 0 || minute > 59) return 0;
        return Math.floor(minute / 15);
    }

    function formatMonthDayWithWeekday(dateObj) {
        const day = dateObj.getDate();
        const month = dateObj.toLocaleDateString("en-AU", { month: "short" });
        const weekday = dateObj.toLocaleDateString("en-AU", { weekday: "short" });
        return `${day} ${month} (${weekday})`;
    }

    function formatMonthYear(dateObj) {
        return dateObj.toLocaleDateString("en-AU", {
            month: "long",
            year: "numeric"
        });
    }

    function getWeekDates(anchorDate) {
        const start = startOfWeekMonday(anchorDate);
        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return date;
        });
    }

    function loadAllTasks() {
        try {
            const raw = localStorage.getItem(TASKS_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            if (!parsed || typeof parsed !== "object") return {};
            return parsed;
        } catch (e) {
            console.warn("Failed to parse tasks:", e);
            return {};
        }
    }

    function saveAllTasks(tasksByDate) {
        localStorage.setItem(TASKS_KEY, JSON.stringify(tasksByDate));
    }

    function getTasksForDate(key) {
        const tasksByDate = loadAllTasks();
        const tasks = tasksByDate[key];
        return Array.isArray(tasks) ? tasks : [];
    }

    function getWeekTaskMap(weekDates) {
        const map = new Map();
        weekDates.forEach((date) => {
            const key = dateKey(date);
            map.set(key, getTasksForDate(key));
        });
        return map;
    }

    function renderTimeRail(targetEl) {
        if (!targetEl) return;
        targetEl.innerHTML = "";

        for (let hour = 0; hour < 24; hour += 1) {
            const label = document.createElement("div");
            label.className = "time-label";
            label.textContent = hourLabel(hour);
            targetEl.appendChild(label);
        }
    }

    function buildWeekSlots(weekDates) {
        if (!weekBodyEl || !weekSlotTemplate) return;
        weekBodyEl.innerHTML = "";

        for (let hour = 0; hour < 24; hour += 1) {
            for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
                const slot = weekSlotTemplate.content.firstElementChild.cloneNode(true);
                const slotDate = weekDates[dayIndex];

                slot.dataset.hour = String(hour);
                slot.dataset.dayIndex = String(dayIndex);
                slot.dataset.dateKey = dateKey(slotDate);

                const addBtn = slot.querySelector(".slot-add-btn");
                addBtn.setAttribute("aria-label", `Add task at ${hourLabel(hour)} on ${slotDate.toDateString()}`);
                addBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    openAddModal(slot.dataset.dateKey, hour);
                });

                const quarterEls = slot.querySelectorAll(".slot-quarter");
                quarterEls.forEach((quarterEl) => {
                    quarterEl.addEventListener("dragover", (e) => {
                        e.preventDefault();
                    });

                    quarterEl.addEventListener("drop", (e) => {
                        e.preventDefault();
                        if (!dragPayload) return;
                        const quarterIndex = Number(quarterEl.dataset.quarter);
                        moveTaskToSlot(
                            dragPayload,
                            slot.dataset.dateKey,
                            Number(slot.dataset.hour),
                            quarterIndex * 15
                        );
                        dragPayload = null;
                    });
                });

                weekBodyEl.appendChild(slot);
            }
        }
    }

    function renderWeekHeader(weekDates) {
        if (!weekHeaderEl) return;
        const today = atNoon(new Date());
        const taskMap = getWeekTaskMap(weekDates);

        weekHeaderEl.innerHTML = "";
        weekDates.forEach((date) => {
            const key = dateKey(date);
            const tasks = taskMap.get(key) || [];
            const tbd = tasks.filter((task) => !Number.isInteger(task.scheduledHour));

            const cell = document.createElement("div");
            cell.className = "week-day-header";
            if (sameDay(date, today)) {
                cell.classList.add("today");
            }

            const weekday = document.createElement("div");
            weekday.className = "weekday-name";
            weekday.textContent = date.toLocaleDateString("en-AU", { weekday: "short" });

            const day = document.createElement("div");
            day.className = "weekday-date";
            day.textContent = date.getDate();

            const tbdWrap = document.createElement("div");
            tbdWrap.className = "tbd-chip-wrap";

            if (tbd.length) {
                tbd.slice(0, 2).forEach((task) => {
                    const chip = document.createElement("button");
                    chip.type = "button";
                    chip.className = "tbd-chip";
                    chip.textContent = task.title || "Task";
                    chip.draggable = true;
                    chip.addEventListener("click", () => openEditModal(key, task.id));
                    chip.addEventListener("dragstart", () => {
                        dragPayload = {
                            taskId: task.id,
                            fromDateKey: key
                        };
                    });
                    tbdWrap.appendChild(chip);
                });

                if (tbd.length > 2) {
                    const more = document.createElement("div");
                    more.className = "tbd-more";
                    more.textContent = `+${tbd.length - 2} more`;
                    tbdWrap.appendChild(more);
                }
            }

            cell.appendChild(weekday);
            cell.appendChild(day);
            cell.appendChild(tbdWrap);
            weekHeaderEl.appendChild(cell);
        });
    }

    function renderWeekTimedTasks(weekDates) {
        const taskMap = getWeekTaskMap(weekDates);

        weekDates.forEach((date) => {
            const key = dateKey(date);
            const tasks = taskMap.get(key) || [];
            const timedTasks = tasks
                .map((task) => ({ task, time: getTaskTimeParts(task) }))
                .filter((entry) => entry.time !== null)
                .sort((a, b) => (a.time.hour - b.time.hour) || (a.time.minute - b.time.minute) || ((a.task.createdAt || 0) - (b.task.createdAt || 0)));

            timedTasks.forEach(({ task, time }) => {
                const selector = `.week-slot[data-date-key="${key}"][data-hour="${time.hour}"]`;
                const slot = weekBodyEl.querySelector(selector);
                if (!slot) return;
                const quarterIndex = quarterIndexFromMinute(time.minute);
                const lane = slot.querySelector(`.slot-quarter[data-quarter="${quarterIndex}"]`);
                if (!lane) return;

                const card = document.createElement("button");
                card.type = "button";
                card.className = `task-card priority-${(task.priority || "medium").toLowerCase()}`;
                card.textContent = task.title || "Task";
                card.title = `${task.title || "Task"}\n${time.normalized}`;
                card.dataset.timeLabel = time.normalized;
                card.draggable = true;
                card.addEventListener("click", (e) => {
                    e.stopPropagation();
                    openEditModal(key, task.id);
                });
                card.addEventListener("dragstart", () => {
                    dragPayload = {
                        taskId: task.id,
                        fromDateKey: key
                    };
                });

                lane.appendChild(card);
            });
        });
    }

    function moveTaskToSlot(payload, toDateKey, toHour, toMinute) {
        if (!payload || !payload.taskId || !Number.isInteger(toHour)) return;
        const safeMinute = Number.isInteger(toMinute) ? Math.min(59, Math.max(0, toMinute)) : 0;

        const tasksByDate = loadAllTasks();
        const fromList = Array.isArray(tasksByDate[payload.fromDateKey]) ? tasksByDate[payload.fromDateKey] : [];
        const fromIndex = fromList.findIndex((task) => task.id === payload.taskId);
        if (fromIndex === -1) return;

        const [task] = fromList.splice(fromIndex, 1);
        task.scheduledHour = toHour;
        task.scheduledMinute = safeMinute;
        task.scheduledTime = `${String(toHour).padStart(2, "0")}:${String(safeMinute).padStart(2, "0")}`;
        task.updatedAt = Date.now();

        if (!Array.isArray(tasksByDate[toDateKey])) {
            tasksByDate[toDateKey] = [];
        }

        tasksByDate[toDateKey].push(task);
        tasksByDate[payload.fromDateKey] = fromList;
        saveAllTasks(tasksByDate);
        refreshCalendarViews();
    }

    function renderWeekView() {
        const weekDates = getWeekDates(activeDate);
        buildWeekSlots(weekDates);
        renderWeekHeader(weekDates);
        renderWeekTimedTasks(weekDates);
    }

    function renderMonthGrid() {
        if (!monthDaysEl) return;

        const monthDate = atNoon(activeDate);
        const monthStart = atNoon(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));
        const offset = (monthStart.getDay() + 6) % 7;
        const gridStart = atNoon(new Date(monthStart));
        gridStart.setDate(monthStart.getDate() - offset);

        const today = atNoon(new Date());
        monthDaysEl.innerHTML = "";

        for (let i = 0; i < 42; i += 1) {
            const dayDate = atNoon(new Date(gridStart));
            dayDate.setDate(gridStart.getDate() + i);

            const key = dateKey(dayDate);
            const tasks = getTasksForDate(key);
            const button = document.createElement("button");

            button.type = "button";
            button.className = "tasks-month-day";
            button.dataset.date = key;

            if (dayDate.getMonth() !== monthDate.getMonth()) {
                button.classList.add("outside");
            }

            if (sameDay(dayDate, today)) {
                button.classList.add("today");
            }

            if (sameDay(dayDate, selectedMonthDate)) {
                button.classList.add("selected");
            }

            const dayNum = document.createElement("div");
            dayNum.className = "tasks-month-day-num";
            dayNum.textContent = String(dayDate.getDate());

            const count = document.createElement("div");
            count.className = "tasks-month-day-count";
            count.textContent = tasks.length ? `${tasks.length} task${tasks.length > 1 ? "s" : ""}` : "";

            button.appendChild(dayNum);
            button.appendChild(count);

            button.addEventListener("click", () => {
                selectedMonthDate = atNoon(dayDate);
                renderMonthGrid();
                updateSelectedDateLabel();
                renderMonthAgenda();
            });

            monthDaysEl.appendChild(button);
        }
    }

    function renderMonthAgenda() {
        if (!monthBodyEl) return;

        const key = dateKey(selectedMonthDate);
        const tasks = getTasksForDate(key);

        monthBodyEl.innerHTML = "";

        const tbd = tasks.filter((task) => !Number.isInteger(task.scheduledHour));

        for (let hour = 0; hour < 24; hour += 1) {
            const slot = document.createElement("div");
            slot.className = "month-slot";
            slot.dataset.hour = String(hour);

            const timedTasks = tasks
                .map((task) => ({ task, time: getTaskTimeParts(task) }))
                .filter((entry) => entry.time && entry.time.hour === hour)
                .sort((a, b) => (a.time.minute - b.time.minute) || ((a.task.createdAt || 0) - (b.task.createdAt || 0)));

            timedTasks.forEach(({ task, time }) => {
                const card = document.createElement("button");
                card.type = "button";
                card.className = `task-card priority-${(task.priority || "medium").toLowerCase()}`;
                card.textContent = task.title || "Task";
                card.dataset.timeLabel = time.normalized;
                card.addEventListener("click", (e) => {
                    e.stopPropagation();
                    openEditModal(key, task.id);
                });
                slot.appendChild(card);
            });

            monthBodyEl.appendChild(slot);
        }

        if (tbd.length) {
            const tbdRow = document.createElement("div");
            tbdRow.className = "month-tbd-row";
            const label = document.createElement("div");
            label.className = "month-tbd-label";
            label.textContent = "Time TBD";
            tbdRow.appendChild(label);

            const chips = document.createElement("div");
            chips.className = "month-tbd-chips";
            tbd.forEach((task) => {
                const chip = document.createElement("button");
                chip.type = "button";
                chip.className = "tbd-chip";
                chip.textContent = task.title || "Task";
                chip.addEventListener("click", () => openEditModal(key, task.id));
                chips.appendChild(chip);
            });
            tbdRow.appendChild(chips);
            monthBodyEl.prepend(tbdRow);
        }
    }

    function updateSelectedDateLabel() {
        if (!selectedDateLabelEl) return;
        selectedDateLabelEl.textContent = `${selectedMonthDate.toLocaleDateString("en-AU", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        })}`;
    }

    function updateRangeLabel() {
        if (!rangeLabelEl) return;

        if (viewMode === "week") {
            const weekDates = getWeekDates(activeDate);
            const start = weekDates[0];
            const end = weekDates[6];
            rangeLabelEl.textContent = `${formatMonthDayWithWeekday(start)} - ${formatMonthDayWithWeekday(end)}`;
            return;
        }

        rangeLabelEl.textContent = formatMonthYear(activeDate);
    }

    function setViewMode(nextMode) {
        viewMode = nextMode;
        const isWeek = viewMode === "week";

        weekViewEl.classList.toggle("hidden", !isWeek);
        monthViewEl.classList.toggle("hidden", isWeek);

        weekViewBtn.classList.toggle("active", isWeek);
        weekViewBtn.setAttribute("aria-selected", isWeek.toString());

        monthViewBtn.classList.toggle("active", !isWeek);
        monthViewBtn.setAttribute("aria-selected", (!isWeek).toString());

        updateRangeLabel();
    }

    function refreshCalendarViews() {
        renderWeekView();
        renderMonthGrid();
        renderMonthAgenda();
        updateSelectedDateLabel();
        updateRangeLabel();
    }

    function shiftPeriod(direction) {
        if (viewMode === "week") {
            activeDate.setDate(activeDate.getDate() + 7 * direction);
            activeDate = atNoon(activeDate);
            renderWeekView();
        } else {
            activeDate.setMonth(activeDate.getMonth() + direction);
            activeDate = atNoon(activeDate);
            renderMonthGrid();
        }

        updateRangeLabel();
    }

    function goToToday() {
        activeDate = atNoon(new Date());
        selectedMonthDate = atNoon(new Date());
        refreshCalendarViews();
    }

    function closeTaskModal() {
        if (!backdrop || !modal) return;
        backdrop.classList.add("hidden");
        modal.classList.add("hidden");
        statusEl.textContent = "";
        editingTaskId = null;
        modalDateKey = "";
        modalHour = null;
    }

    function setModalContext() {
        if (!scheduleContextEl) return;
        if (!modalDateKey) {
            scheduleContextEl.textContent = "";
            return;
        }

        const dateObj = dateFromKey(modalDateKey);
        const selectedTime = normalizeTimeInput(timeInput ? timeInput.value : "");
        if (selectedTime) {
            scheduleContextEl.textContent = `Scheduled: ${dateObj.toLocaleDateString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long"
            })}, ${selectedTime}`;
        } else {
            scheduleContextEl.textContent = `Scheduled: ${dateObj.toLocaleDateString("en-AU", {
                weekday: "long",
                day: "numeric",
                month: "long"
            })} (TBD)`;
        }
    }

    function openAddModal(targetDateKey, targetHour) {
        editingTaskId = null;
        modalDateKey = targetDateKey;
        modalHour = targetHour;

        modalTitleEl.textContent = "ADD TASK";
        confirmBtn.textContent = "Add";
        deleteBtn.classList.add("hidden");

        titleInput.value = "";
        notesInput.value = "";
        prioritySelect.value = "medium";
        timeInput.value = hourToTimeInput(targetHour);
        statusEl.textContent = "";

        setModalContext();
        backdrop.classList.remove("hidden");
        modal.classList.remove("hidden");
        titleInput.focus();
    }

    function openEditModal(targetDateKey, taskId) {
        const tasks = getTasksForDate(targetDateKey);
        const task = tasks.find((item) => item.id === taskId);
        if (!task) return;

        editingTaskId = taskId;
        modalDateKey = targetDateKey;
        modalHour = Number.isInteger(task.scheduledHour) ? task.scheduledHour : null;
        const taskTime = getTaskTimeParts(task);

        modalTitleEl.textContent = "EDIT TASK";
        confirmBtn.textContent = "Save";
        deleteBtn.classList.remove("hidden");

        titleInput.value = task.title || "";
        notesInput.value = task.notes || "";
        prioritySelect.value = task.priority || "medium";
        timeInput.value = taskTime ? taskTime.normalized : "";
        statusEl.textContent = "";

        setModalContext();
        backdrop.classList.remove("hidden");
        modal.classList.remove("hidden");
        titleInput.focus();
    }

    function upsertTask() {
        const title = titleInput.value.trim();
        const notes = notesInput.value.trim();
        const priority = prioritySelect.value;
        const normalizedTime = normalizeTimeInput(timeInput.value);
        const chosenHour = parseHourFromTimeInput(timeInput.value);
        const chosenMinute = parseMinuteFromTimeInput(timeInput.value);

        if (!title) {
            statusEl.textContent = "Please enter a task title.";
            return;
        }

        const tasksByDate = loadAllTasks();
        const key = modalDateKey || dateKey(activeDate);
        const list = Array.isArray(tasksByDate[key]) ? tasksByDate[key] : [];

        if (editingTaskId) {
            const index = list.findIndex((task) => task.id === editingTaskId);
            if (index === -1) return;

            list[index].title = title;
            list[index].notes = notes;
            list[index].priority = priority;
            list[index].scheduledHour = chosenHour;
            list[index].scheduledMinute = chosenMinute;
            list[index].scheduledTime = normalizedTime;
            list[index].updatedAt = Date.now();
            statusEl.textContent = "Task updated.";
        } else {
            list.push({
                id: Date.now(),
                title,
                notes,
                priority,
                scheduledHour: chosenHour,
                scheduledMinute: chosenMinute,
                scheduledTime: normalizedTime,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            statusEl.textContent = "Task added.";
        }

        tasksByDate[key] = list;
        saveAllTasks(tasksByDate);

        refreshCalendarViews();
        setTimeout(closeTaskModal, 500);
    }

    function deleteTask() {
        if (!editingTaskId || !modalDateKey) return;

        const tasksByDate = loadAllTasks();
        const list = Array.isArray(tasksByDate[modalDateKey]) ? tasksByDate[modalDateKey] : [];
        tasksByDate[modalDateKey] = list.filter((task) => task.id !== editingTaskId);

        saveAllTasks(tasksByDate);
        refreshCalendarViews();
        closeTaskModal();
    }

    function openSystemSettings() {
        if (!systemSettingsModal || !backdrop) return;
        backdrop.classList.remove("hidden");
        systemSettingsModal.classList.remove("hidden");
    }

    function closeSystemSettings() {
        if (!systemSettingsModal || !backdrop) return;

        const modalOpen = modal && !modal.classList.contains("hidden");
        systemSettingsModal.classList.add("hidden");
        if (!modalOpen) {
            backdrop.classList.add("hidden");
        }
    }

    function setActiveTab(tabKey) {
        navButtons.forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.tab === tabKey);
        });

        panels.forEach((panel) => {
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

    function loadUserName() {
        const saved = localStorage.getItem(USER_NAME_KEY);
        return saved && saved.trim() ? saved : DEFAULT_USER_NAME;
    }

    function loadSemesterLabel() {
        const saved = localStorage.getItem(SEMESTER_KEY);
        return saved && saved.trim() ? saved : DEFAULT_SEMESTER_LABEL;
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
        populateAccountInputs();
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
        modalDateKey = "";
        modalHour = null;
        activeDate = atNoon(new Date());
        selectedMonthDate = atNoon(new Date());
        populateAccountInputs();
        refreshCalendarViews();
    }

    function generateDemoTasksByDate() {
        const titles = [
            "Review lecture notes",
            "Gym session",
            "Read assigned material",
            "Prepare for tutorial",
            "Work on assignment draft",
            "Finish quiz practice",
            "Group study session",
            "Draft weekly plan",
            "Read chapter 4",
            "Prepare lab notes",
            "Update weekly planner",
            "Revise formulas and/or key concepts",
            "Watch tutorial",
            "Clean up inbox",
            "Organise study notes",
            "Plan tomorrow's schedule",
            "Buy groceries",
            "Call brother",
            "Go for a run",
            "Clean study desk"
        ];
        const notes = [
            "Focus on core concepts.",
            "Keep this short and focused.",
            "Highlight key points for revision later.",
            "Check upcoming deadlines while reviewing.",
            "Write down questions to ask in class.",
            "Bring examples into notes.",
            "Double-check deadlines.",
            "Aim to complete in one sitting.",
            "Leave 10 minutes for review."
        ];
        const priorities = ["low", "medium", "high"];
        const quarterMinutes = [0, 15, 30, 45];
        const baseDate = atNoon(new Date());
        const tasksByDate = {};
        const totalTasks = randomInt(24, 38);
        const now = Date.now();

        for (let i = 0; i < totalTasks; i += 1) {
            const dateOffset = randomInt(-10, 40);
            const dateObj = atNoon(new Date(baseDate));
            dateObj.setDate(baseDate.getDate() + dateOffset);
            const key = dateKey(dateObj);
            const withTime = Math.random() < 0.78;
            const scheduledHour = withTime ? randomInt(7, 21) : null;
            const scheduledMinute = withTime ? pick(quarterMinutes) : null;
            const scheduledTime = withTime
                ? `${String(scheduledHour).padStart(2, "0")}:${String(scheduledMinute).padStart(2, "0")}`
                : null;

            const task = {
                id: now + i,
                title: pick(titles),
                notes: pick(notes),
                priority: pick(priorities),
                scheduledHour,
                scheduledMinute,
                scheduledTime,
                createdAt: now - randomInt(0, 8) * 86400000,
                updatedAt: now - randomInt(0, 2) * 3600000
            };

            if (!Array.isArray(tasksByDate[key])) {
                tasksByDate[key] = [];
            }
            tasksByDate[key].push(task);
        }

        return tasksByDate;
    }

    function loadDemoTasksData() {
        const demoTasksByDate = generateDemoTasksByDate();
        localStorage.setItem(TASKS_KEY, JSON.stringify(demoTasksByDate));
        localStorage.setItem(USER_NAME_KEY, "Demo Student");
        localStorage.setItem(SEMESTER_KEY, DEFAULT_SEMESTER_LABEL);

        editingTaskId = null;
        modalDateKey = "";
        modalHour = null;
        activeDate = atNoon(new Date());
        selectedMonthDate = atNoon(new Date());
        populateAccountInputs();
        refreshCalendarViews();
    }

    if (menuToggle) {
        const savedCollapsed = localStorage.getItem(NAV_COLLAPSED_KEY) === "1";
        setNavCollapsed(mobileNavQuery.matches ? true : savedCollapsed);
        menuToggle.addEventListener("click", () => {
            const next = !document.body.classList.contains("nav-collapsed");
            setNavCollapsed(next);
        });
    }

    if (todayBtn) {
        todayBtn.addEventListener("click", goToToday);
    }

    if (previousBtn) {
        previousBtn.addEventListener("click", () => shiftPeriod(-1));
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => shiftPeriod(1));
    }

    if (weekViewBtn) {
        weekViewBtn.addEventListener("click", () => setViewMode("week"));
    }

    if (monthViewBtn) {
        monthViewBtn.addEventListener("click", () => setViewMode("month"));
    }

    if (cancelBtn) {
        cancelBtn.addEventListener("click", closeTaskModal);
    }

    if (confirmBtn) {
        confirmBtn.addEventListener("click", upsertTask);
    }

    if (deleteBtn) {
        deleteBtn.addEventListener("click", deleteTask);
    }

    if (timeInput) {
        timeInput.addEventListener("change", () => {
            modalHour = parseHourFromTimeInput(timeInput.value);
            setModalContext();
        });
    }

    if (backdrop) {
        backdrop.addEventListener("click", () => {
            if (systemSettingsModal && !systemSettingsModal.classList.contains("hidden")) {
                closeSystemSettings();
                return;
            }
            if (modal && !modal.classList.contains("hidden")) {
                closeTaskModal();
            }
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;

        if (systemSettingsModal && !systemSettingsModal.classList.contains("hidden")) {
            closeSystemSettings();
            return;
        }

        if (modal && !modal.classList.contains("hidden")) {
            closeTaskModal();
        }
    });

    if (systemSettingsBtn && systemSettingsModal && backdrop) {
        systemSettingsBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openSystemSettings();
        });

        navButtons.forEach((btn) => {
            btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
        });

        setActiveTab("general");
    }

    if (darkToggle) {
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
        loadDemoDataBtn.addEventListener("click", loadDemoTasksData);
    }

    if (saveAccountBtn) {
        saveAccountBtn.addEventListener("click", saveAccountSettings);
    }

    populateAccountInputs();
    renderTimeRail(weekTimeRailEl);
    renderTimeRail(monthTimeRailEl);
    refreshCalendarViews();
    setViewMode("week");
});
