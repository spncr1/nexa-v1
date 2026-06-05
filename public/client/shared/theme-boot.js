/* to allow for more seamless transitions page-to-page while in dark mode */
(function () {
    const hasDarkModeCookie = document.cookie
        .split("; ")
        .some(cookie => cookie === "nexa_dark_mode=1");

    if (hasDarkModeCookie) {
        document.body.classList.add("dark-mode");
    }
})();
