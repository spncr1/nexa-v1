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

    // Storage
    const STORAGE_KEY = "studenthub_subjects";

    function loadSubjects() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
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

    // Wiring up the events:
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

        document.querySelectorAll(".subjects-list .subject-item")
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

    // Initial render
    renderSubjects(loadSubjects());

    function updateSubjectsOverflowHint() {
        const panel = document.querySelector(".subjects-panel");
        if (!panel) return;
        const canScroll = subjectsListEl.scrollHeight > subjectsListEl.clientHeight + 1;
        panel.classList.toggle("has-more", canScroll);
    }
});