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

    if (!menuToggle) return;

    const savedCollapsed = localStorage.getItem(NAV_COLLAPSED_KEY) === "1";
    setNavCollapsed(savedCollapsed);

    menuToggle.addEventListener("click", () => {
        const next = !document.body.classList.contains("nav-collapsed");
        setNavCollapsed(next);
    });
});
