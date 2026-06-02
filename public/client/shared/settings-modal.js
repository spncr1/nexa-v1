document.addEventListener("DOMContentLoaded", async () => {
    await window.NexaAppStorage.ready;

    const storage = window.NexaAppStorage;
    let currentUser = storage.getCurrentUser();
    const menuToggle = document.querySelector(".menu-toggle");
    const systemSettingsBtn = document.getElementById("system-settings-btn");
    const systemSettingsModal = document.getElementById("system-settings-modal");
    const navButtons = document.querySelectorAll(".settings-nav");
    const panels = document.querySelectorAll(".settings-panel");
    const subtitle = document.getElementById("settings-subtitle");
    const darkToggle = document.getElementById("dark-mode-toggle");
    const resetAppDataBtn = document.getElementById("reset-app-data-btn");
    const accountNameInput = document.getElementById("account-name-input");
    const accountEmailInput = document.getElementById("account-email-input");
    const accountSemesterInput = document.getElementById("account-semester-input");
    const saveAccountBtn = document.getElementById("save-account-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const deleteAccountBtn = document.getElementById("delete-account-btn");
    let settingsStatusEl = null;
    let settingsStatusTimer = null;

    const NAV_COLLAPSED_KEY = "studenthub_nav_collapsed";
    const USER_NAME_KEY = "studenthub_user_name";
    const SEMESTER_KEY = "studenthub_semester_label";
    const APP_DATA_KEYS = ["tasksByDate", "studenthub_subjects", "studenthub_assignments", USER_NAME_KEY, SEMESTER_KEY];
    const DEFAULT_USER_NAME = currentUser?.name || "Student";
    const DEFAULT_SEMESTER_LABEL = "Untitled Semester";

    function setNavCollapsed(isCollapsed) {
        document.body.classList.toggle("nav-collapsed", isCollapsed);
        storage.setItem(NAV_COLLAPSED_KEY, isCollapsed ? "1" : "0");
        menuToggle?.setAttribute("aria-expanded", (!isCollapsed).toString());
    }

    function loadUserName() {
        const saved = storage.getItem(USER_NAME_KEY);
        return saved && saved.trim() ? saved : DEFAULT_USER_NAME;
    }

    function loadSemesterLabel() {
        const saved = storage.getItem(SEMESTER_KEY);
        return saved && saved.trim() ? saved : DEFAULT_SEMESTER_LABEL;
    }

    function populateAccountInputs() {
        if (accountNameInput) accountNameInput.value = loadUserName();
        if (accountEmailInput) accountEmailInput.value = currentUser?.email || "";
        if (accountSemesterInput) accountSemesterInput.value = loadSemesterLabel();
    }

    function ensureSettingsStatus() {
        if (settingsStatusEl) return settingsStatusEl;

        settingsStatusEl = document.createElement("p");
        settingsStatusEl.className = "settings-status hidden";
        settingsStatusEl.setAttribute("role", "status");
        systemSettingsModal?.insertAdjacentElement("afterend", settingsStatusEl);

        return settingsStatusEl;
    }

    function positionSettingsStatus() {
        const statusEl = ensureSettingsStatus();
        if (!systemSettingsModal) return;

        const modalRect = systemSettingsModal.getBoundingClientRect();
        statusEl.style.left = `${modalRect.left + modalRect.width / 2}px`;
        statusEl.style.top = `${modalRect.bottom + 12}px`;
    }

    function clearSettingsStatus() {
        window.clearTimeout(settingsStatusTimer);
        settingsStatusTimer = null;
        if (!settingsStatusEl) return;

        settingsStatusEl.classList.add("hidden");
        settingsStatusEl.textContent = "";
    }

    function showSettingsStatus(message) {
        const statusEl = ensureSettingsStatus();

        statusEl.textContent = message;
        positionSettingsStatus();
        statusEl.classList.remove("hidden");
        window.clearTimeout(settingsStatusTimer);
        settingsStatusTimer = window.setTimeout(clearSettingsStatus, 2500);
    }

    function openSystemSettings() {
        clearSettingsStatus();
        systemSettingsModal?.classList.remove("hidden");
        populateAccountInputs();
    }

    function closeSystemSettings() {
        systemSettingsModal?.classList.add("hidden");
        clearSettingsStatus();
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
        storage.setItem("darkMode", isOn ? "1" : "0");
    }

    async function saveAccountSettings() {
        const nameValue = (accountNameInput?.value || "").trim() || DEFAULT_USER_NAME;
        const emailValue = (accountEmailInput?.value || "").trim().toLowerCase();
        const semesterValue = (accountSemesterInput?.value || "").trim() || DEFAULT_SEMESTER_LABEL;

        if (!emailValue) {
            window.alert("Email cannot be blank.");
            populateAccountInputs();
            return;
        }

        const response = await fetch("/api/me", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ name: nameValue, email: emailValue })
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            window.alert(payload.error || "Could not update account details right now.");
            populateAccountInputs();
            return;
        }

        currentUser = await response.json();
        storage.setCurrentUser(currentUser);
        storage.setItem(USER_NAME_KEY, nameValue);
        storage.setItem(SEMESTER_KEY, semesterValue);
        populateAccountInputs();
        showSettingsStatus("Account details saved successfully.");
    }

    async function logoutCurrentUser() {
        const confirmed = window.confirm("Are you sure you want to log out?");
        if (!confirmed) return;

        const response = await fetch("/logout", {
            method: "DELETE",
            credentials: "same-origin"
        });

        if (!response.ok) {
            window.alert("Could not log out right now.");
            return;
        }

        window.location.href = "/login";
    }

    function showAccountDeletedNotice() {
        const notice = document.createElement("div");
        notice.className = "account-delete-notice";
        notice.textContent = "Account deleted successfully.";
        document.body.appendChild(notice);
    }

    async function deleteCurrentUserAccount() {
        const confirmed = window.confirm("Are you sure you want to delete this account? This cannot be undone.");
        if (!confirmed) return;

        const response = await fetch("/api/me", {
            method: "DELETE",
            credentials: "same-origin"
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            window.alert(payload.error || "Could not delete account right now.");
            return;
        }

        showAccountDeletedNotice();
        window.setTimeout(() => {
            window.location.href = "/login";
        }, 900);
    }

    function resetAllAppData() {
        const confirmed = window.confirm(
            "Reset all app data? This will permanently delete all saved tasks, subjects, and assignments across the application."
        );
        if (!confirmed) return;
        APP_DATA_KEYS.forEach((key) => storage.removeItem(key));
        populateAccountInputs();
    }

    menuToggle?.addEventListener("click", () => {
        const next = !document.body.classList.contains("nav-collapsed");
        setNavCollapsed(next);
    });

    systemSettingsBtn?.addEventListener("click", openSystemSettings);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeSystemSettings();
    });
    window.addEventListener("resize", () => {
        if (settingsStatusEl && !settingsStatusEl.classList.contains("hidden")) {
            positionSettingsStatus();
        }
    });

    navButtons.forEach((btn) => {
        btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
    });

    darkToggle?.addEventListener("change", () => setDarkMode(darkToggle.checked));
    resetAppDataBtn?.addEventListener("click", resetAllAppData);
    saveAccountBtn?.addEventListener("click", () => {
        saveAccountSettings().catch((error) => {
            console.error("Failed to save account settings:", error);
            window.alert("Could not update account details right now.");
        });
    });
    logoutBtn?.addEventListener("click", () => {
        logoutCurrentUser().catch((error) => {
            console.error("Failed to log out:", error);
            window.alert("Could not log out right now.");
        });
    });
    deleteAccountBtn?.addEventListener("click", () => {
        deleteCurrentUserAccount().catch((error) => {
            console.error("Failed to delete account:", error);
            window.alert("Could not delete account right now.");
        });
    });

    setActiveTab("general");
    setNavCollapsed(storage.getItem(NAV_COLLAPSED_KEY) === "1");
    const savedDarkMode = storage.getItem("darkMode") === "1";
    if (darkToggle) darkToggle.checked = savedDarkMode;
    setDarkMode(savedDarkMode);
    populateAccountInputs();
});
