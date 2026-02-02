// just gonna keep this simple to help at least get an idea for the dashboard

/* Date Buttons Interactivity */
const todayBtn = document.getElementById("today-btn");
const previousBtn = document.getElementById("previous-btn");
const nextBtn = document.getElementById("next-btn");

/* Date/Day Changes Interactivity */
const dateDisplay = document.getElementById("date-display");
const dayDisplay = document.getElementById("day-display");

// Load the last selected date from localStorage (so that when you referesh, you keep your place)
const savedDate = localStorage.getItem("selectedDate");

// IF there is a saved date, use it. Otherwise default to today.
let selectedDate = savedDate ? new Date(savedDate) : new Date();

// Normalise the time to midday to avoid timezone issues
selectedDate.setHours(12, 0, 0, 0);

/* helper fumctions for dates */
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

    localStorage.getItem("selectedDate", selectedDate.toISOString()); // save the selected date so that refreshing the page doesn't reset it
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

/* EVENTS WIRING (Clicks): */
todayBtn.addEventListener("click", goToToday);
previousBtn.addEventListener("click", () => changeDay(-1));
nextBtn.addEventListener("click", () => changeDay(+1));

renderDate();

// the code i used to create my hamburger-style navbar for an older version of my personal website. will need some tweaking and i don't understand all of it just yet, but this can give me an idea on how i could do it
const menuToggle = document.querySelector('.menu-toggle');
const sideNav = document.querySelector('.navbar');

if (menuToggle && navbar) {
    menuToggle.addEventListener("click", () => {
        navbar.classList.toggle("open");
    });
}