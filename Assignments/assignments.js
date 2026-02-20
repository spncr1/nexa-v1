document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const subjectsListEl = document.getElementById("subjects-list");
    const addSubjectBtn = document.getElementById("add-subject-btn");

    const subjectBackdrop = document.getElementById("subject-modal-backdrop");
    const subjectModal = document.getElementById("add-subject-modal");
    const subjectNameInput = document.getElementById("subject-name");
    const subjectStatus = document.getElementById("subject-status");

    const cancelSubjectBtn = document.getElementById("cancel-subject-btn");
    const confirmSubjectBtn = document.getElementById("confirm-subject-btn");

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
            btm.className = "subject-item" + (idx === 0 ? " active" : "");
            btn.dataset.subject = s.id;
            btn.textContent = s.name;
            
            btn.addEventListener("click", () => {
                document
                    .querySelectorAll(".subjects-list .subject-item")
                    .forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
            });

            li.appendChild(btn);
            subjectsListEl.appendChild(li);
        });
    }

    // Modal helpers
    function openSubjectModal() {
        subjectStatus.textContent = "";
        subjectNameInput.value = "";
        subjectBackdrop.classList.remove("hidden");
        subjectModal.classList.remove("hidden");
        subjectNameInput.focus();
    }

    function closeSubjectModal() {
        subjectBackdrop.classList.add("hidden");
        subjectModal.classList.add("hidden");
    }

    // Add subject
    function addSubject() {
        const name = subjectNameInput.value.trim();

        if (!name) {
            subjectStatus.textContent = "Please enter a subject name.";
            return;
        }

        const subjects = loadSubjects();

        // prevents duplicates (case-sensitive)
        const exists = subjects.some(s => s.name.toLowerCase() === name.toLowerCase());
        if (exists) {
            subjectStatus.textContent = "That subject already exists.";
            return;
        }

        const newSubject = {
            id: `subject_${Date.now()}`, name
        };

        subjects.push(newSubject);
        saveSubjects(subjects);
        renderSubjects(subjects);
        closeSubjectModal();
    }

    // Wiring up the events:
    addSubjectBtn.addEventListener("click", openSubjectModal);
    cancelSubjectBtn.addEventListener("click", closeSubjectModal);
    subjectBackdrop.addEventListener("click", closeSubjectModal);

    confirmSubjectBtn.addEventListener("click", addSubject);

    // Enter key submits
    subjectNameInput.addEventListener("keywdown", (e) => {
        if (e.key === "Enter") addSubject();
        if (e.key === "Escape") closeSubjectModal();
    });

    // Initial render
    renderSubjects(loadSubjects());
});