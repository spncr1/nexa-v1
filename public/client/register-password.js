/* Suggested password lists & randomiser logic for suggested password feature on register page */

const passwordInput = document.querySelector("#password");
const confirmPasswordInput = document.querySelector("#confirmPassword");
const generatePasswordButton = document.querySelector("#generate-password-btn");
const togglePasswordButton = document.querySelector("#toggle-password-btn");

const passwordWordsA = [
    "artist",
    "baker",
    "citizen",
    "driver",
    "fireman",
    "gardener",
    "library",
    "pilot",
    "runner",
    "station",
    "student",
    "teacher"
];

const passwordWordsB = [
    "bridge",
    "cloud",
    "forest",
    "harbour",
    "notebook",
    "planet",
    "river",
    "signal",
    "silver",
    "stone",
    "window",
    "yellow"
];

const passwordNumbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const passwordSymbols = ["!", "$", "#", "%", "&", "?"];
const passwordSeparators = ["", "-", "_"];

const passwordPatterns = [
    ({ firstWord, secondWord, separator, number, symbol }) => `${firstWord}${separator}${secondWord}${number}${symbol}`,
    ({ firstWord, secondWord, separator, number, symbol }) => `${firstWord}${number}${separator}${secondWord}${symbol}`,
    ({ firstWord, secondWord, separator, number, symbol }) => `${firstWord}${separator}${secondWord}${symbol}${number}`,
    ({ firstWord, secondWord, separator, number, symbol }) => `${firstWord}${symbol}${secondWord}${number}`,
    ({ firstWord, secondWord, separator, number, symbol }) => `${firstWord}${separator}${number}${secondWord}${symbol}`
];

function randomIndex(length) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % length;
}

function randomItem(items) {
    return items[randomIndex(items.length)];
}

function randomNumberBlock() {
    const length = 2 + randomIndex(3);
    let number = "";

    for (let index = 0; index < length; index += 1) {
        number += randomItem(passwordNumbers);
    }

    return number;
}

function capitalizePassword(password) {
    return password.charAt(0).toUpperCase() + password.slice(1);
}

function isValidSuggestedPassword(password) {
    return (
        password.length >= 12 &&
        password.length <= 64 &&
        /[A-Z]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    );
}

function generateSuggestedPassword() {
    for (let attempt = 0; attempt < 30; attempt += 1) {
        const passwordParts = {
            firstWord: randomItem(passwordWordsA),
            secondWord: randomItem(passwordWordsB),
            separator: randomItem(passwordSeparators),
            number: randomNumberBlock(),
            symbol: randomItem(passwordSymbols)
        };
        const pattern = randomItem(passwordPatterns);
        const password = capitalizePassword(pattern(passwordParts));

        if (isValidSuggestedPassword(password)) {
            return password;
        }
    }

    return "Citizen-river7!";
}

function setPasswordVisibility(isVisible) {
    if (!passwordInput || !togglePasswordButton) return;

    passwordInput.type = isVisible ? "text" : "password";
    if (confirmPasswordInput) {
        confirmPasswordInput.type = isVisible ? "text" : "password";
    }
    const visibilityIcon = togglePasswordButton.querySelector(".password-visibility-icon");
    if (visibilityIcon) {
        visibilityIcon.src = isVisible
            ? "/client/shared/assets/Icons/visibility-off.svg"
            : "/client/shared/assets/Icons/visibility-on.svg";
    }
    togglePasswordButton.setAttribute("aria-label", isVisible ? "Hide password" : "Show password");
    togglePasswordButton.setAttribute("aria-pressed", String(isVisible));
}

if (generatePasswordButton && passwordInput) {
    generatePasswordButton.addEventListener("click", () => {
        const suggestedPassword = generateSuggestedPassword();

        passwordInput.value = suggestedPassword;
        if (confirmPasswordInput) {
            confirmPasswordInput.value = suggestedPassword;
        }
        setPasswordVisibility(true);
        passwordInput.focus();
    });
}

if (togglePasswordButton && passwordInput) {
    togglePasswordButton.addEventListener("click", () => {
        setPasswordVisibility(passwordInput.type === "password");
    });
}
