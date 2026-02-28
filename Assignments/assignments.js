document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.querySelector(".menu-toggle");
    const navbar = document.querySelector(".navbar");

    if (menuToggle && navbar) {
        menuToggle.addEventListener("click", () => {
            navbar.classList.toggle("open");
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

    const assignmentsSort = document.getElementById("assignments-sort");
    const assignmentsFilter = document.getElementById("assignments-filter");

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

        (assignments || []).forEach(a => {
            if (!a || !a.courseId) return;

            if (!map.has(a.courseId)) {
                map.set(a.courseId, []);
            }
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
    }

    function deleteSubject() {
        if (!editingSubjectId) return;

        const subjects = loadSubjects().filter(s => s.id !== editingSubjectId);

        saveSubjects(subjects);
        renderSubjects(subjects);
        showSubjectStatus("Subject deleted.", { closeAfter: true });
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
    }

    function deleteAssignment() {
        if (!editingAssignmentId) return;
        const assignments = loadAssignments().filter(a => a.id !== editingAssignmentId);
        saveAssignments(assignments);
        renderAssignments();
        closeAssignmentModal();
    }

    // Widget FUNCTIONS
    function createPieSVG(assignmentsForSubject, subjectName) {
        const size = 120;
        const radius = size / 2;
        
        const weights = assignmentsForSubject
            .map(a => Number(a.weighting))
            .filter(Number.isFinite)
        
        const total = weights.reduce((sum, w) => sum + w, 0);

        const wrapper = document.createElement("div");
        wrapper.style.textAlign = "center";

        const title = document.createElement("div");
        title.textContent = subjectName;
        title.style.fontWeight = "700";
        title.style.marginBottom = "6px";
        wrapper.appendChild(title);
        
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", size);
        svg.setAttribute("height", size);
        svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

        let startAngle = 0;

        assignmentsForSubject.forEach((a, index) => {
            const w = Number(a.weighting);
            if (!Number.isFinite(w) || total === 0) return;

            if (!total) {
                const msg= document.createElement("div");
                msg.textContent = "No weightings yet";
                msg.style.fontSize = "12px";
                msg.style.opacity = "0.8";
                wrapper.appendChild(msg);
                return wrapper;
            }

            const sliceAngle = (w / total) * 2 * Math.PI;
            const endAngle = startAngle + sliceAngle;

            const x1 = radius + radius * Math.cos(startAngle);
            const y1 = radius + radius * Math.sin(startAngle);
            const x2 = radius + radius * Math.cos(endAngle);
            const y2 = radius + radius * Math.sin(endAngle);

            const largeArc = sliceAngle > Math.PI ? 1 : 0;

            const path = document.createElementNS(svgNS, "path");
            path.setAttribute("d",
                `M ${radius} ${radius}
                 L ${x1} ${y1}
                 A ${radius} ${radius}  0 ${largeArc} 1 ${x2} ${y2}
                 Z`
            );

            const hue = (index * 60) % 360;
            const colour = `hsl(${hue}, 70%, 55%)`;

            path.style.setProperty("fill", colour, "important");
            path.style.setProperty("stroke", "none", "important");

            svg.appendChild(path);
            startAngle = endAngle;
        });

        wrapper.appendChild(svg);
        return wrapper;
    }

    function renderCarousel() {
        const slideEl = document.getElementById("carousel-slide");
        const dotsEl = document.getElementById("carousel-dots");
        if (!slideEl || !dotsEl) return;

        slideEl.innerHTML = "";
        dotsEl.innerHTML = "";

        if (!carouselSubjects.length) {
            slideEl.textContent = "No assignments yet.";
            return;
        }

        if (carouselIndex >= carouselSubjects.length) carouselIndex = 0;
        if (carouselIndex < 0 || carouselIndex >= carouselSubjects.length) carouselIndex = 0;

        const current = carouselSubjects[carouselIndex];
        slideEl.appendChild(
            createPieSVG(current.assignments, current.name)
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
            const hasWeights = list.some(a => Number.isFinite(Number(a.weighting)) && Number(a.weighting) > 0);
            if (!hasWeights) return;
                carouselSubjects.push({
                    id: s.id,
                    name: s.name,
                    assignments: list
                });
        });

        carouselIndex = 0;
        renderCarousel();
    }

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
        closeSystemSettings(); // using the shared backdrop for both
    });

    document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        closeAssignmentModal();
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

     // Initial render
    renderSubjects(loadSubjects());
    populateCourseOptions();
    renderAssignments();
    rebuildCarousel();
    subjectsListEl.addEventListener("scroll", updateSubjectsOverflowHint);
    window.addEventListener("resize", updateSubjectsOverflowHint);
});