(function () {
    const LOGIN_PATH = '/login';
    const ME_ENDPOINT = '/api/me';
    const APP_STATE_ENDPOINT = '/api/app-state';

    let currentUser = null;
    let storageState = {};
    let saveTimer = null;
    let savePromise = Promise.resolve();

    async function fetchJson(url, options = {}) {
        const response = await fetch(url, {
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            },
            ...options
        });

        if (response.status === 401) {
            window.location.href = LOGIN_PATH;
            throw new Error('Not authenticated');
        }

        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `Request failed with status ${response.status}`);
        }

        return response.json();
    }

    function clearLegacyBrowserStorage() {
        try {
            window.localStorage.clear();
        } catch (error) {
            console.warn('Failed to clear legacy browser storage:', error);
        }
    }

    function scheduleSave() {
        if (saveTimer) {
            window.clearTimeout(saveTimer);
        }

        saveTimer = window.setTimeout(() => {
            savePromise = fetchJson(APP_STATE_ENDPOINT, {
                method: 'PUT',
                body: JSON.stringify({ storage: storageState })
            }).catch((error) => {
                console.error('Failed to persist app state:', error);
            });
        }, 150);
    }

    function getItem(key) {
        return Object.prototype.hasOwnProperty.call(storageState, key)
            ? storageState[key]
            : null;
    }

    function setItem(key, value) {
        storageState[key] = String(value);
        scheduleSave();
    }

    function removeItem(key) {
        delete storageState[key];
        scheduleSave();
    }

    function clear() {
        storageState = {};
        if (currentUser?.name) {
            storageState.studenthub_user_name = currentUser.name;
        }
        scheduleSave();
    }

    function key(index) {
        return Object.keys(storageState)[index] || null;
    }

    async function init() {
        const user = await fetchJson(ME_ENDPOINT);
        const statePayload = await fetchJson(APP_STATE_ENDPOINT);

        currentUser = user;
        storageState = statePayload.storage && typeof statePayload.storage === 'object'
            ? { ...statePayload.storage }
            : {};

        if (!storageState.studenthub_user_name && currentUser?.name) {
            storageState.studenthub_user_name = currentUser.name;
        }

        clearLegacyBrowserStorage();
    }

    window.NexaAppStorage = {
        ready: init(),
        getCurrentUser: () => currentUser,
        setCurrentUser: (user) => {
            currentUser = user;
        },
        getItem,
        setItem,
        removeItem,
        clear,
        key,
        get length() {
            return Object.keys(storageState).length;
        },
        flush: () => savePromise
    };
})();
