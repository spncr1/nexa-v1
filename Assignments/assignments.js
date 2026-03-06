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

    /* ==== Elements ==== */
    const subjectsListEl = document.getElementById("subjects-list");
    const addSubjectBtn = document.getElementById("add-subject-btn");

    const subjectBackdrop = document.getElementById("subject-modal-backdrop");
    const subjectModal = document.getElementById("add-subject-modal");
    const subjectModalTitle = document.getElementById("subject-modal-title");
    const subjectNameInput = document.getElementById("subject-name");
    const subjectStatus = document.getElementById("subject-status");

    const cancelSubjectBtn = document.getElementById("cancel-subject-btn");
    const confirmSubjectBtn = document.getElementById("confirm-subject-btn");
    const deleteSubjectBtn = document.getElementById("delete-subject-btn");

    /* System Settings elements */
    const systemSettingsBtn = document.getElementById("system-settings-btn");
    const systemSettingsModal = document.getElementById("system-settings-modal");
    const backdrop = document.getElementById("modal-backdrop");

    const navButtons = document.querySelectorAll(".settings-nav");
    const panels = document.querySelectorAll(".settings-panel");
    const subtitle = document.getElementById("settings-subtitle");
    const darkToggle = document.getElementById("dark-mode-toggle");

    /* Add Assignment elements */
    const addAssignmentBtn = document.getElementById("add-assignment-btn");
    const assignmentsBody = document.getElementById("assignments-body");

    const assignmentModal = document.getElementById("add-assignment-modal");
    const assignmentModalTitle = document.getElementById("assignment-modal-title");

    const assignmentCourse = document.getElementById("assignment-course");
    const assignmentTask = document.getElementById("assignment-task");
    const assignmentDesc = document.getElementById("assignment-desc");
    const assignmentPriority = document.getElementById("assignment-priority");
    const assignmentStatus = document.getElementById("assignment-status");
    const assignmentDue = document.getElementById("assignment-due");
    const assignmentWeight = document.getElementById("assignment-weight");
    
    const assignmentStatusText = document.getElementById("assignment-status-text");
    const cancelAssignmentBtn = document.getElementById("cancel-assignment-btn");
    const deleteAssignmentBtn = document.getElementById("delete-assignment-btn");
    const confirmAssignmentBtn = document.getElementById("confirm-assignment-btn");
    const viewAssignmentModal = document.getElementById("view-assignment-modal");
    const viewAssignmentTitle = document.getElementById("view-assignment-title");
    const viewAssignmentDesc = document.getElementById("view-assignment-desc");

    const assignmentsSort = document.getElementById("assignments-sort");
    const assignmentsFilter = document.getElementById("assignments-filter");
    const resetAssignmentsBtn = document.getElementById("reset-btn");
    const hoverSound = new Audio("/Sfx/omnitrixTurnOn.MP3");

    const ASSIGNMENTS_KEY = "studenthub_assignments";
    let editingAssignmentId = null;

    /* Widget elements */
    let carouselIndex = 0;
    let carouselSubjects = [];

    // Storage
    const STORAGE_KEY = "studenthub_subjects";

    function loadSubjects() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed)
                ? parsed.filter(s => s && typeof s.id === "string" && typeof s.name === "string")
                : [];
        } catch (e) {
            console.warn("Failed to parse subjects from localStorage:", e);
            return [];
        }
    }

    function saveSubjects(subjects) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
    }

    let editingSubjectId = null;
    
    const STATUS_MS = 1500;
    let statusTimer = null;

    function clearSubjectStatus() {
        if (statusTimer) clearTimeout(statusTimer);
        statusTimer = null;
        subjectStatus.textContent = "";
    }

    function showSubjectStatus(message, { closeAfter = false } = {}) {
        subjectStatus.textContent = message;

        if (statusTimer) clearTimeout(statusTimer);
        statusTimer = setTimeout(() => {
            clearSubjectStatus();
            if (closeAfter) closeSubjectModal();
        }, STATUS_MS);
    }

    // RENDER
    function renderSubjects(subjects) {
        subjectsListEl.innerHTML = "";

        if (!subjects.length) {
            const li = document.createElement("li");
            li.innerHTML = `<button type="button" class="subject-item" disabled>No subjects yet </button>`;
            subjectsListEl.appendChild(li);
            return;
        }

        subjects.forEach((s, idx) => {
            const li = document.createElement("li");
            const btn = document.createElement("button");

            btn.type = "button";
            btn.className = "subject-item" + (idx === 0 ? " active" : "");
            btn.dataset.subjectId = s.id;
            btn.textContent = s.name;

            li.appendChild(btn);
            subjectsListEl.appendChild(li);
        });
    }

    // Modal helpers
    function openSubjectModal() {
        editingSubjectId = null;

        subjectModalTitle.textContent = "ADD SUBJECT";
        confirmSubjectBtn.textContent = "Add";
        subjectStatus.textContent = "";
        subjectNameInput.value = "";
        subjectBackdrop.classList.remove("hidden");
        subjectModal.classList.remove("hidden");
        deleteSubjectBtn.classList.add("hidden");
        subjectNameInput.focus();
    }

    function editSubjectModal(subjectId) {
        const subjects = loadSubjects();
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return;

        editingSubjectId = subjectId;

        subjectModalTitle.textContent = "EDIT SUBJECT";
        confirmSubjectBtn.textContent = "Save";
        deleteSubjectBtn.classList.remove("hidden");
        subjectStatus.textContent = "";
        subjectNameInput.value = subject.name;
        subjectBackdrop.classList.remove("hidden");
        subjectModal.classList.remove("hidden");
        subjectNameInput.focus();
    }

    function closeSubjectModal() {
        subjectBackdrop.classList.add("hidden");
        subjectModal.classList.add("hidden");
        subjectStatus.textContent = "";
    }

    // Widget helpers
    function groupAssignmentsBySubject(assignments) {
        const map = new Map();

        assignments.forEach(a => {
            if (!a || !a.courseId) return;

            if (!map.has(a.courseId)) map.set(a.courseId, []);
            map.get(a.courseId).push(a);
        });
        
        return map;
    }

    // Add subject
    function addSubject() {
        const name = subjectNameInput.value.trim();

        if (!name) {
            showSubjectStatus("Please enter a subject name.");
            return;
        }

        const subjects = loadSubjects();

        // prevents duplicates (case-sensitive)
        const exists = subjects.some(s => s.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            subjectStatus.textContent = "That subject already exists.";
            return;
        }

        const now = Date.now();
        const newSubject = {
            id: `subject_${Date.now()}`, 
            name,
            createdAt: now,
            updatedAt: now
        };

        subjects.push(newSubject);
        saveSubjects(subjects);
        renderSubjects(subjects);
        showSubjectStatus("Subject added successfully.", { closeAfter: true });
        renderTotalCourseAssignmentsWidget();
    }

    function saveSubjectEdits() {
        if (!editingSubjectId) return;

        const name = subjectNameInput.value.trim();
        if (!name) {
            subjectStatus.textContent = "Subject name is required.";
            return;
        }

        const subjects = loadSubjects();

        const duplicate = subjects.some(
            s => s.id !== editingSubjectId && s.name.toLowerCase() === name.toLowerCase()
        );
        if (duplicate) {
            subjectStatus.textContent = "That subject already exists.";
            return;
        }

        const idx = subjects.findIndex(s => s.id === editingSubjectId);
        if (idx === -1) return;

        subjects[idx].name = name;
        subjects[idx].updatedAt = Date.now();

        saveSubjects(subjects);
        renderSubjects(subjects);
        showSubjectStatus("Subject updated.", { closeAfter: true });
        renderTotalCourseAssignmentsWidget();
    }

    function deleteSubject() {
        if (!editingSubjectId) return;

        const subjects = loadSubjects().filter(s => s.id !== editingSubjectId);

        saveSubjects(subjects);
        renderSubjects(subjects);
        showSubjectStatus("Subject deleted.", { closeAfter: true });
        renderTotalCourseAssignmentsWidget();
    }

    function openSystemSettings() {
        backdrop.classList.remove("hidden");
        systemSettingsModal.classList.remove("hidden");
    }

    function closeSystemSettings() {
        systemSettingsModal.classList.add("hidden");

        const subjectOpen = subjectModal && !subjectModal.classList.contains("hidden");
        const assignmentOpen = assignmentModal && !assignmentModal.classList.contains("hidden");

        if (!subjectOpen && !assignmentOpen) {
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

    if (systemSettingsBtn && systemSettingsModal && backdrop) {
        systemSettingsBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openSystemSettings();
        });

        backdrop.addEventListener("click", () => {
            closeSystemSettings();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key !== "Escape") return;
            closeSystemSettings();
        });

        navButtons.forEach(btn => {
            btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
        });

        setActiveTab("general");

        if (darkToggle) {
            const saved = localStorage.getItem("darkMode") === "1";
            darkToggle.checked = saved;
            setDarkMode(saved);

            darkToggle.addEventListener("change", () => {
                setDarkMode(darkToggle.checked);
            });
        }
    }

    // Add Assignment
    function loadAssignments() {
        try {
            const raw = localStorage.getItem(ASSIGNMENTS_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed)) return [];

            return parsed.filter(a =>
                a &&
                typeof a.id === "string" &&
                typeof a.courseId === "string" &&
                typeof a.task === "string"
            );
        } catch (e) {
            console.warn("Failed to parse assignments:", e);
            return [];
        }
    }

    function saveAssignments(assignments) {
        localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
    }

    function formatDueDate(iso) {
        if (!iso) return "";

        const d = new Date(`${iso}T00:00:00`);
        if (Number.isNaN(d.getTime())) return iso;
    
        const formatted = new Intl.DateTimeFormat("en-AU", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(d);
        
        const parts = formatted.split(" ");
        if (parts.length === 3) return `${parts[0]} ${parts[1]}, ${parts[2]}`; // e.g., the date should be returned as: 20 March, 2026

        return formatted;
    }

    function formatWeight(num) {
        if (num === null || num === undefined || num === "") return "";
        const n = Number(num);
        if (!Number.isFinite(n)) return "";
        return n.toFixed(1);
    }

    function wordCount(str) {
        return (str || "").trim().split(/\s+/).filter(Boolean).length;
    }

    function populateCourseOptions() {
        const subjects = loadSubjects(); // uses existing local storage to load subjects in
        assignmentCourse.innerHTML = "";

        if (!subjects.length) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "No subjects yet (add one first)";
            assignmentCourse.appendChild(opt);
            assignmentCourse.disabled = true;
            return;
        }

        assignmentCourse.disabled = false;

        subjects.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = s.name;
            assignmentCourse.appendChild(opt);
        });
    }

    function parseISODate(iso) {
        if (!iso) return null;
        const d = new Date(`${iso}T00:00:00`);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    function priorityRank(p) {
        return p === "high" ? 3 : p === "medium" ? 2 : p === "low" ? 1 : 0;
    }

    function calculateSubjectTotals(assignments) {
        const totals = new Map();

        assignments.forEach(a => {
            const w = Number(a.weighting);
            if (!Number.isFinite(w)) return;

            const current = totals.get(a.courseId) || 0;
            totals.set(a.courseId, current + w);
        });

        return totals;
    }

    function renderAssignments() {
        let assignments = loadAssignments();
        assignmentsBody.innerHTML = "";
        if (!assignments.length) return;

        // FILTER (by priority)
        const filterVal = (assignmentsFilter?.value || "all").toLowerCase();
        if (filterVal !== "all") {
            assignments = assignments.filter(a => (a.priority || "").toLowerCase() === filterVal);
        }

        // SORT
        const sortVal = assignmentsSort?.value || "dueSoon";

        assignments.sort((a, b) => {
            const aDate = parseISODate(a.dueDate);
            const bDate = parseISODate(b.dueDate);

            const aWeight = Number.isFinite(a.weighting) ? a.weighting : null;
            const bWeight = Number.isFinite(b.weighting) ? b.weighting : null;

            switch (sortVal) {
                case "dueSoon":
                    if (!aDate && !bDate) return 0;
                    if (!aDate) return 1;
                    if (!bDate) return -1;
                    return aDate - bDate;
                case "dueLate":
                    if (!aDate && !bDate) return 0;
                    if (!aDate) return 1;
                    if (!bDate) return -1;
                    return bDate - aDate;
                case "weightHigh":
                    if (aWeight === null && bWeight === null) return 0;
                    if (aWeight === null) return 1;
                    if (bWeight === null) return -1;
                    return bWeight - aWeight;
                case "weightLow":
                    if (aWeight === null && bWeight === null) return 0;
                    if (aWeight === null) return 1;
                    if (bWeight === null) return -1;
                    return aWeight - bWeight;
                case "priority":
                    return priorityRank(b.priority) - priorityRank(a.priority);
                default:
                    return 0;
            }
        });

        const subjects = loadSubjects();
        const subjectNameById = new Map(subjects.map(s => [s.id, s.name]));

        const subjectTotals = calculateSubjectTotals(assignments);
        
        assignments.forEach(a => {
            const tr = document.createElement("tr");
            tr.dataset.assignmentId = a.id;
            const courseName = subjectNameById.get(a.courseId) || "(Deleted subject)";
            const totalForSubject = subjectTotals.get(a.courseId) || 0;
            const w = Number(a.weighting);

            let shareText = "";
            if (Number.isFinite(a.weighting) && totalForSubject > 0) {
                const share = (a.weighting / totalForSubject) * 100;
                shareText = share.toFixed(1) + "%";
            }

            tr.innerHTML = `
                <td>${courseName}</td>
                <td>${a.task}</td>
                <td>${a.priority}</td>
                <td>${a.status}</td>
                <td>${formatDueDate(a.dueDate)}</td>
                <td>${formatWeight(a.weighting)}</td>
                <td>${shareText}</td>
            `;

            assignmentsBody.appendChild(tr);
        });
    }

    function openAssignmentModalAdd() {
        editingAssignmentId = null;

        populateCourseOptions();

        assignmentModalTitle.textContent = "ADD ASSIGNMENT";
        confirmAssignmentBtn.textContent = "Add";
        deleteAssignmentBtn.classList.add("hidden");
        assignmentStatusText.textContent = "";

        assignmentTask.value = "";
        assignmentDesc.value = "";
        assignmentPriority.value = "medium";
        assignmentStatus.value = "not-started";
        assignmentDue.value = "";
        assignmentWeight.value = "";

        backdrop.classList.remove("hidden");
        assignmentModal.classList.remove("hidden");
        assignmentTask.focus();
    }

    function openAssignmentModalEdit(assignmentId) {
        const assignments = loadAssignments();
        const a = assignments.find(x => x.id === assignmentId);
        if (!a) return;

        editingAssignmentId = assignmentId;

        populateCourseOptions();

        assignmentModalTitle.textContent = "EDIT ASSIGNMENT";
        confirmAssignmentBtn.textContent = "Save";
        deleteAssignmentBtn.classList.remove("hidden");
        assignmentStatusText.textContent = "";

        assignmentCourse.value = a.courseId || "";
        assignmentTask.value = a.task || "";
        assignmentDesc.value = a.description || "";
        assignmentPriority.value = a.priority || "medium";
        assignmentStatus.value = a.status || "not-started";
        assignmentDue.value = a.dueDate || "";
        assignmentWeight.value = (a.weighting ?? "");

        backdrop.classList.remove("hidden");
        assignmentModal.classList.remove("hidden");
    }

    function closeAssignmentModal() {
        assignmentModal.classList.add("hidden");
        assignmentStatusText.textContent = "";
        backdrop.classList.add("hidden");
    }

    function openViewAssignmentModal(assignment) {
        if (!viewAssignmentModal || !viewAssignmentTitle || !viewAssignmentDesc) return;

        const taskName = (assignment?.task || "").trim() || "Assignment";
        const description = (assignment?.description || "").trim() || "No task description added yet.";

        viewAssignmentTitle.textContent = taskName;
        viewAssignmentDesc.textContent = description;

        backdrop.classList.remove("hidden");
        viewAssignmentModal.classList.remove("hidden");
    }

    function closeViewAssignmentModal() {
        if (!viewAssignmentModal) return;
        viewAssignmentModal.classList.add("hidden");
    }

    function addAssignment() {
        if (assignmentCourse.disabled) {
            assignmentStatusText.textContent = "Add a subject first.";
            return;
        }

        const task = assignmentTask.value.trim();
        if (!task) {
            assignmentStatusText.textContent = "Task name is required.";
            return;
        }

        const desc = assignmentDesc.value.trim();
        if (wordCount(desc) > 500) {
            assignmentStatusText.textContent = "Description exceeds 500 words. Please enter less characters.";
            return;
        }
        
        const weightRaw = assignmentWeight.value.trim();
        const weighting = weightRaw === "" ?  null : Number(weightRaw);
        if (weighting !== null && !Number.isFinite(weighting)) {
            assignmentStatusText.textContent = "Weighting must be a number.";
            return;
        }

        const now = Date.now();
        const assignments = loadAssignments();

        const newAssignment = {
            id: `assignment_${now}`,
            courseId: assignmentCourse.value,
            task,
            description: desc,
            priority: assignmentPriority.value,
            status: assignmentStatus.value,
            dueDate: assignmentDue.value,
            weighting,
            createdAt: now,
            updatedAt: now
        };

        assignments.push(newAssignment);
        saveAssignments(assignments);
        renderAssignments();
        closeAssignmentModal();
        renderTotalCourseAssignmentsWidget();
        renderDashboard();
    }

    function saveAssignmentEdits() {
        if (!editingAssignmentId) return;

        const task = assignmentTask.value.trim();
        if (!task) {
            assignmentStatusText.textContent = "Task  name is required.";
            return;
        }

        const desc = assignmentDesc.value.trim();
        if (wordCount(desc) > 500) {
            assignmentStatusText.textContent = "Description exceeds 500 words. Please enter less characters.";
        }
        
        const weightRaw = assignmentWeight.value.trim();
        const weighting = weightRaw === "" ? null : Number(weightRaw);
        if (weighting !== null && !Number.isFinite(weighting)) {
            assignmentStatusText.textContent = "Weighting must be a number.";
            return;
        }

        const assignments = loadAssignments();
        const idx = assignments.findIndex(a => a.id === editingAssignmentId);
        if (idx === -1) return;

        assignments[idx] = {
            ...assignments[idx],
            courseId: assignmentCourse.value,
            task,
            description: desc,
            priority: assignmentPriority.value,
            status: assignmentStatus.value,
            dueDate: assignmentDue.value,
            weighting,
            updatedAt: Date.now()
        };

        saveAssignments(assignments);
        renderAssignments();
        closeAssignmentModal();
        renderTotalCourseAssignmentsWidget();
        renderDashboard();
    }

    function deleteAssignment() {
        if (!editingAssignmentId) return;
        const assignments = loadAssignments().filter(a => a.id !== editingAssignmentId);
        saveAssignments(assignments);
        renderAssignments();
        closeAssignmentModal();
        renderTotalCourseAssignmentsWidget();
        renderDashboard();
    }

    function resetAllAssignments() {
        const assignments = loadAssignments();
        if (!assignments.length) {
            alert("No assignments to reset.");
            return;
        }

        const confirmed = window.confirm(
            "Reset all assignments? This will permanently delete every assignment in the table."
        );
        if (!confirmed) return;

        localStorage.removeItem(ASSIGNMENTS_KEY);
        editingAssignmentId = null;

        closeAssignmentModal();
        renderAssignments();
        rebuildCarousel();
        renderTotalCourseAssignmentsWidget();
        renderDashboard();
    }

    // Widget FUNCTIONS
    function createPieSVG(assignmentsForSubject) {
        const cssPieSize = parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue("--pie-size")
        );
        const size = Number.isFinite(cssPieSize) && cssPieSize > 0 ? cssPieSize : 160;
        const radius = size / 2;
        const svgNS = "http://www.w3.org/2000/svg";

        const wrapper = document.createElement("div");
        wrapper.style.textAlign = "center";

        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", size);
        svg.setAttribute("height", size);
        svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

        const validAssignments = (assignmentsForSubject || []).filter(a => a && typeof a.task === "string");
        if (!validAssignments.length) {
            const msg = document.createElement("div");
            msg.textContent = "No assignments yet.";
            msg.style.fontSize = "12px";
            msg.style.opacity = "0.8";
            wrapper.appendChild(msg);
            return wrapper;
        }

        const slices = validAssignments.map((a, index) => {
            const rawWeight = Number(a.weighting);
            return {
                assignment: a,
                index,
                rawWeight: Number.isFinite(rawWeight) && rawWeight >= 0 ? rawWeight : 0
            };
        });

        const totalWeight = slices.reduce((sum, s) => sum + s.rawWeight, 0);
        const equalShare = totalWeight <= 0 ? 1 / slices.length : 0;

        let startAngle = 0;

        function playSliceHoverSound() {
            hoverSound.currentTime = 0;
            hoverSound.play().catch(() => {});
        }

        slices.forEach((slice) => {
            const ratio = totalWeight > 0 ? (slice.rawWeight / totalWeight) : equalShare;
            const sliceAngle = ratio * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;
            const hue = (slice.index * 60) % 360;
            const pct = ratio * 100;
            const midAngle = startAngle + sliceAngle / 2;

            if (sliceAngle >= (2 * Math.PI - 1e-6)) {
                const circle = document.createElementNS(svgNS, "circle");
                circle.setAttribute("cx", radius);
                circle.setAttribute("cy", radius);
                circle.setAttribute("r", radius);
                circle.setAttribute("fill", `hsl(${hue}, 70%, 55%)`);
                circle.classList.add("pie-slice");
                circle.addEventListener("click", () => openViewAssignmentModal(slice.assignment));
                circle.addEventListener("mouseenter", playSliceHoverSound);
                svg.appendChild(circle);
            } else {
                const x1 = radius + radius * Math.cos(startAngle);
                const y1 = radius + radius * Math.sin(startAngle);
                const x2 = radius + radius * Math.cos(endAngle);
                const y2 = radius + radius * Math.sin(endAngle);
                const largeArc = sliceAngle > Math.PI ? 1 : 0;

                const path = document.createElementNS(svgNS, "path");
                path.setAttribute(
                    "d",
                    `M ${radius} ${radius}
                    L ${x1} ${y1}
                    A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}
                    Z`
                );
                path.setAttribute("fill", `hsl(${hue}, 70%, 55%)`);
                path.classList.add("pie-slice");
                path.addEventListener("click", () => openViewAssignmentModal(slice.assignment));
                path.addEventListener("mouseenter", playSliceHoverSound);
                svg.appendChild(path);
            }

            // Label inside each slice: task + weighting %
            const labelRadius = radius * 0.62;
            const tx = radius + Math.cos(midAngle) * labelRadius;
            const ty = radius + Math.sin(midAngle) * labelRadius;

            const label = document.createElementNS(svgNS, "text");
            label.setAttribute("x", tx);
            label.setAttribute("y", ty);
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("dominant-baseline", "middle");
            label.classList.add("pie-label");

            const line1 = document.createElementNS(svgNS, "tspan");
            line1.setAttribute("x", tx);
            line1.setAttribute("dy", "-0.45em");
            line1.textContent = (slice.assignment.task || "Task").trim().slice(0, 11);

            const line2 = document.createElementNS(svgNS, "tspan");
            line2.setAttribute("x", tx);
            line2.setAttribute("dy", "1.2em");
            line2.textContent = `${pct.toFixed(1)}%`;

            label.appendChild(line1);
            label.appendChild(line2);
            svg.appendChild(label);

            startAngle = endAngle;
        });

        wrapper.appendChild(svg);
        return wrapper;
    }

    function renderCarousel() {
        const subjectEl = document.getElementById("carousel-subject");
        const slideEl = document.getElementById("carousel-slide");
        const dotsEl = document.getElementById("carousel-dots");
        if (!subjectEl || !slideEl || !dotsEl) return;

        slideEl.innerHTML = "";
        dotsEl.innerHTML = "";
        subjectEl.textContent = "";

        if (!carouselSubjects.length) {
            slideEl.textContent = "No assignments yet.";
            return;
        }

        if (carouselIndex >= carouselSubjects.length) carouselIndex = 0;
        if (carouselIndex < 0 || carouselIndex >= carouselSubjects.length) carouselIndex = 0;

        const current = carouselSubjects[carouselIndex];
        subjectEl.textContent = current.name;
        slideEl.appendChild(
            createPieSVG(current.assignments)
        );

        carouselSubjects.forEach((_, i) => {
            const dot = document.createElement("span");
            if (i === carouselIndex) dot.classList.add("active");
            dotsEl.appendChild(dot);
        });
    }

    function rebuildCarousel() {
        const assignments = loadAssignments();
        const subjects = loadSubjects();
        const grouped = groupAssignmentsBySubject(assignments);

        carouselSubjects = [];

        subjects.forEach(s => {
            const list = grouped.get(s.id) || [];
            
            if (!list.length) return;

            carouselSubjects.push({
                id: s.id,
                name: s.name,
                assignments: list
            });
        });

        carouselIndex = 0;
        renderCarousel();
    }

    function getSubjectColour(i) {
        // Stable, readable colours (repeat safely)
        const palette = [
            "hsl(210, 70%, 55%)",
            "hsl(120, 70%, 50%)",
            "hsl(40, 100%, 50%)",
            "hsl(290, 65%, 60%)",
            "hsl(0, 75%, 60%)",
            "hsl(180, 65%, 45%)"
        ];
        return palette[i % palette.length];
        }

        function countAssignmentsBySubject(assignments) {
        const counts = new Map();
        assignments.forEach(a => {
            if (!a || !a.courseId) return;
            counts.set(a.courseId, (counts.get(a.courseId) || 0) + 1);
        });
        return counts;
        }

    function renderTotalCourseAssignmentsWidget() {
        const barsEl = document.getElementById("total-assignments-bars");
        const legendEl = document.getElementById("total-assignments-legend");
        const maxEl = document.getElementById("total-assignments-max");
        if (!barsEl || !legendEl) return;

        const subjects = loadSubjects();
        const assignments = loadAssignments();
        const counts = countAssignmentsBySubject(assignments);

        // build rows (keep only subjects that exist)
        const rows = subjects.map((s, idx) => ({
            id: s.id,
            name: s.name,
            count: counts.get(s.id) || 0,
            colour: getSubjectColour(idx)
        }));

        // choose axis max: fixed 6 (as you requested), but auto-expand if user exceeds it
        const maxCount = Math.max(6, ...rows.map(r => r.count));
        if (maxEl) maxEl.textContent = String(maxCount);

        barsEl.innerHTML = "";
        legendEl.innerHTML = "";

        if (!rows.length) {
            barsEl.innerHTML = `<div style="opacity:.75;font-size:12px;padding:10px;">No subjects yet.</div>`;
            return;
        }

        // OPTIONAL: you can sort by count desc for readability
        rows.sort((a, b) => b.count - a.count);

        rows.forEach(r => {
            const pct = maxCount > 0 ? (r.count / maxCount) * 100 : 0;

            const row = document.createElement("div");
            row.className = "bar-row";

            row.innerHTML = `
            <div class="bar-label">${r.name}</div>
            <div class="bar-trackline">
                <div class="bar-track">
                <div class="bar-fill"></div>
                </div>
                <div class="bar-count">${r.count}</div>
            </div>
            `;

            const fill = row.querySelector(".bar-fill");
            fill.style.width = `${pct}%`;
            fill.style.background = r.colour;

            barsEl.appendChild(row);

            // legend item
            const item = document.createElement("div");
            item.className = "legend-item";
            item.innerHTML = `
            <span class="legend-swatch"></span>
            <span>${r.name}</span>
            `;
            item.querySelector(".legend-swatch").style.background = r.colour;
            legendEl.appendChild(item);
        });
    }

    /* ===== Assignments Dashboard (Status/Priority slides) ===== */
    let dashIndex = 0;
    const dashSlides = ["status", "priority"];

    function statusLabel(s) {
    // your stored values are: not-started, in-progress, completed
    if (s === "not-started") return "Not started";
    if (s === "in-progress") return "In progress";
    if (s === "completed") return "Completed";
    return "Other";
    }

    function priorityLabel(s) {
    // your stored values are: not-started, in-progress, completed
    if (s === "low") return "Low";
    if (s === "medium") return "Medium";
    if (s === "high") return "High";
    return "Other";
    }

    function buildStatusCounts(assignments) {
    const counts = new Map([
        ["not-started", 0],
        ["in-progress", 0],
        ["completed", 0],
    ]);

    assignments.forEach(a => {
        const key = (a?.status || "").toLowerCase();
        if (counts.has(key)) counts.set(key, counts.get(key) + 1);
        else counts.set("other", (counts.get("other") || 0) + 1);
    });

    // remove "other" if unused
    if ((counts.get("other") || 0) === 0) counts.delete("other");
    return counts;
    }

    function buildPriorityCounts(assignments) {
    const counts = new Map([
        ["low", 0],
        ["medium", 0],
        ["high", 0],
    ]);

    assignments.forEach(a => {
        const key = (a?.priority || "").toLowerCase();
        if (counts.has(key)) counts.set(key, counts.get(key) + 1);
        else counts.set("other", (counts.get("other") || 0) + 1);
    });

    // remove "other" if unused
    if ((counts.get("other") || 0) === 0) counts.delete("other");
    return counts;
    }

    function coloursForStatus(key) {
    // simple, readable palette
    if (key === "completed") return "#2ecc71";
    if (key === "in-progress") return "#f1c40f";
    if (key === "not-started") return "#e74c3c";
    return "#7f8c8d";
    }

    function coloursForPriority(key) {
    // simple, readable palette
    if (key === "low") return "#2ecc71";
    if (key === "medium") return "#f1c40f";
    if (key === "high") return "#e74c3c";
    return "#7f8c8d";
    }

    function createVerticalBarChart({ title, countsMap, colourFn, labelFn }) {
    const wrapper = document.createElement("div");
    wrapper.className = "vchart";

    const plot = document.createElement("div");
    plot.className = "vchart-plot";

    const entries = Array.from(countsMap.entries());
    const max = Math.max(1, ...entries.map(([, v]) => v)); // avoid divide by zero

    entries.forEach(([key, val]) => {
        const col = document.createElement("div");
        col.style.display = "flex";
        col.style.flexDirection = "column";
        col.style.alignItems = "center";
        col.style.gap = "0";

        const bar = document.createElement("div");
        bar.className = "vbar";

        const fill = document.createElement("div");
        fill.className = "vbar-fill";
        fill.style.setProperty("--h", `${(val / max) * 100}%`);
        fill.style.setProperty("background", colourFn(key), "important");

        const count = document.createElement("div");
        count.className = "vbar-count";
        count.textContent = String(val);

        bar.appendChild(fill);
        bar.appendChild(count);

        const lbl = document.createElement("div");
        lbl.className = "vbar-label";
        lbl.textContent = labelFn(key);

        col.appendChild(bar);
        col.appendChild(lbl);
        plot.appendChild(col);
    });

    const divider = document.createElement("div");
    divider.className = "vchart-divider";

    const legend = document.createElement("div");
    legend.className = "vchart-legend";

    entries.forEach(([key]) => {
        const item = document.createElement("div");
        item.className = "vchart-legend-item";

        const sw = document.createElement("span");
        sw.className = "vchart-swatch";
        sw.style.background = colourFn(key);

        const txt = document.createElement("span");
        txt.textContent = labelFn(key);

        item.appendChild(sw);
        item.appendChild(txt);
        legend.appendChild(item);
    });

    wrapper.appendChild(plot);
    wrapper.appendChild(divider);
    wrapper.appendChild(legend);

    return wrapper;
    }

    function renderDashboard() {
    const slideEl = document.getElementById("dash-slide");
    const labelEl = document.getElementById("dash-label");
    const dotsEl = document.getElementById("dash-dots");
    if (!slideEl || !labelEl || !dotsEl) return;

    slideEl.innerHTML = "";
    dotsEl.innerHTML = "";

    const assignments = loadAssignments();
    const mode = dashSlides[dashIndex];

    if (mode === "status") {
        labelEl.textContent = "Status";

        const counts = buildStatusCounts(assignments);

        // if truly nothing exists, show a simple message
        const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
        if (total === 0) {
        slideEl.textContent = "No assignments yet.";
        } else {
        slideEl.appendChild(
            createVerticalBarChart({
            title: "Status",
            countsMap: counts,
            colourFn: coloursForStatus,
            labelFn: (k) => (k === "other" ? "Other" : statusLabel(k))
            })
        );
        }
    } else {
        labelEl.textContent = "Priority";

        const counts = buildPriorityCounts(assignments);
        
        // if truly nothing exists, show a simple message
        const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
        if (total === 0) {
        slideEl.textContent = "No assignments yet.";
        } else {
        slideEl.appendChild(
            createVerticalBarChart({
            title: "Priority",
            countsMap: counts,
            colourFn: coloursForPriority,
            labelFn: (k) => (k === "other" ? "Other" : priorityLabel(k))
            })
        );
        }
    }

    dashSlides.forEach((_, i) => {
        const dot = document.createElement("span");
        if (i === dashIndex) dot.classList.add("active");
        dotsEl.appendChild(dot);
    });
    }

    /* dashboard nav wiring */
    document.getElementById("dash-prev")?.addEventListener("click", () => {
    dashIndex = (dashIndex - 1 + dashSlides.length) % dashSlides.length;
    renderDashboard();
    });

    document.getElementById("dash-next")?.addEventListener("click", () => {
    dashIndex = (dashIndex + 1) % dashSlides.length;
    renderDashboard();
    });

    // Wiring up the events (subjects)
    addSubjectBtn.addEventListener("click", openSubjectModal);
    cancelSubjectBtn.addEventListener("click", closeSubjectModal);
    subjectBackdrop.addEventListener("click", closeSubjectModal);
    deleteSubjectBtn.addEventListener("click", deleteSubject);

    confirmSubjectBtn.addEventListener("click", () => {
        if (editingSubjectId) saveSubjectEdits();
        else addSubject();
    });

    // click a subject -> set active + open the "edit" modal
    subjectsListEl.addEventListener("click", (e) => {
        const btn = e.target.closest(".subject-item");
        if (!btn || btn.disabled) return;

        document.querySelectorAll("#subjects-list .subject-item")
            .forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const subjectId = btn.dataset.subjectId;
        editSubjectModal(subjectId);
    });

    // Keyboard behaviour
    subjectNameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            if (editingSubjectId) saveSubjectEdits();
            else addSubject();
        }
        if (e.key === "Escape") closeSubjectModal();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeSubjectModal();
    });

    // Wiring up the events (assignments)
    addAssignmentBtn.addEventListener("click", openAssignmentModalAdd);
    cancelAssignmentBtn.addEventListener("click", closeAssignmentModal);
    deleteAssignmentBtn.addEventListener("click", deleteAssignment);
    assignmentsSort.addEventListener("change", renderAssignments);
    assignmentsFilter.addEventListener("change", renderAssignments);
    resetAssignmentsBtn?.addEventListener("click", resetAllAssignments);

    confirmAssignmentBtn.addEventListener("click", () => {
        if (editingAssignmentId) saveAssignmentEdits();
        else addAssignment();
    });

    assignmentsBody.addEventListener("click", (e) => {
        const tr = e.target.closest("tr");
        if (!tr) return;
        openAssignmentModalEdit(tr.dataset.assignmentId);
    });

    backdrop.addEventListener("click", () => {
        closeAssignmentModal();
        closeViewAssignmentModal();
        closeSystemSettings(); // using the shared backdrop for both
    });

    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        closeAssignmentModal();
        closeViewAssignmentModal();
        closeSystemSettings();
    });
    
    function updateSubjectsOverflowHint() {
        const panel = document.querySelector(".subjects-panel");
        if (!panel) return;
        const canScroll = subjectsListEl.scrollHeight > subjectsListEl.clientHeight + 1;
        panel.classList.toggle("has-more", canScroll);
    }

    // Wiring up the events (widgets)
    document.getElementById("carousel-prev")?.addEventListener("click", () => {
        if (!carouselSubjects.length) return;
        carouselIndex = (carouselIndex - 1 + carouselSubjects.length) % carouselSubjects.length;
        renderCarousel();
    });

    document.getElementById("carousel-next")?.addEventListener("click", () => {
        if (!carouselSubjects.length) return;
        carouselIndex = (carouselIndex + 1 + carouselSubjects.length) % carouselSubjects.length;
        renderCarousel();
    });

    const SEMESTER_KEY = "studenthub_semester_label";

    function loadSemesterLabel() {
        const saved = localStorage.getItem(SEMESTER_KEY);
        return saved && saved.trim() ? saved : "Autumn Session 2026";
    }

    function renderSemesterLabel() {
        const el = document.getElementById("semester-label");
        if (!el) return;
        el.textContent = `(${loadSemesterLabel()})`;
    }

     // Initial render
    renderSubjects(loadSubjects());
    populateCourseOptions();
    renderAssignments();
    rebuildCarousel();
    renderSemesterLabel();
    renderTotalCourseAssignmentsWidget();
    renderDashboard();
    subjectsListEl.addEventListener("scroll", updateSubjectsOverflowHint);
    window.addEventListener("resize", updateSubjectsOverflowHint);
});
