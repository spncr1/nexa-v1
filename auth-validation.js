const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MIN_NAME_LENGTH = 2;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 64;

const COMMON_PASSWORDS = new Set([
    'password',
    'password123',
    'password1234',
    'qwerty123',
    'qwerty123456',
    'letmein123',
    'admin123456',
    'welcome123',
    'nexa12345678'
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const NUMBER_PATTERN = /\d/;
const LETTER_PATTERN = /[A-Za-z]/;
const PASSWORD_UPPERCASE_PATTERN = /[A-Z]/;
const PASSWORD_NUMBER_PATTERN = /\d/;
const PASSWORD_SPECIAL_CHARACTER_PATTERN = /[^A-Za-z0-9]/;

function normalizeName(name) {
    return String(name || '').trim();
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function validateName(name) {
    const normalizedName = normalizeName(name);

    if (!normalizedName) {
        return 'Name is required.';
    }

    if (normalizedName.length < MIN_NAME_LENGTH) {
        return `Name must be at least ${MIN_NAME_LENGTH} characters.`;
    }

    if (normalizedName.length > MAX_NAME_LENGTH) {
        return `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
    }

    if (CONTROL_CHARACTER_PATTERN.test(normalizedName)) {
        return 'Name contains unsupported characters.';
    }

    if (NUMBER_PATTERN.test(normalizedName)) {
        return 'Name cannot contain numbers.';
    }

    if (!LETTER_PATTERN.test(normalizedName)) {
        return 'Name must include at least one letter.';
    }

    return null;
}

function validateEmail(email) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
        return 'Email is required.';
    }

    if (normalizedEmail.length > MAX_EMAIL_LENGTH) {
        return `Email must be ${MAX_EMAIL_LENGTH} characters or fewer.`;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
        return 'Enter a valid email address.';
    }

    return null;
}

function validatePassword(password) {
    const rawPassword = String(password || '');
    const trimmedPassword = rawPassword.trim();

    if (!rawPassword) {
        return 'Password is required.';
    }

    if (!trimmedPassword) {
        return 'Password cannot be only spaces.';
    }

    if (rawPassword.length < MIN_PASSWORD_LENGTH) {
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    if (rawPassword.length > MAX_PASSWORD_LENGTH) {
        return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
    }

    if (!PASSWORD_UPPERCASE_PATTERN.test(rawPassword)) {
        return 'Password must include at least one uppercase letter.';
    }

    if (!PASSWORD_NUMBER_PATTERN.test(rawPassword)) {
        return 'Password must include at least one number.';
    }

    if (!PASSWORD_SPECIAL_CHARACTER_PATTERN.test(rawPassword)) {
        return 'Password must include at least one special character.';
    }

    if (COMMON_PASSWORDS.has(trimmedPassword.toLowerCase())) {
        return 'Choose a less common password.';
    }

    return null;
}

function validateLoginPassword(password) {
    const rawPassword = String(password || '');

    if (!rawPassword) {
        return 'Password is required.';
    }

    if (rawPassword.length > MAX_PASSWORD_LENGTH) {
        return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
    }

    return null;
}

function buildResult(errors, values) {
    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        values
    };
}

function validateRegistrationInput(input = {}) {
    const values = {
        name: normalizeName(input.name),
        email: normalizeEmail(input.email)
    };
    const errors = {};

    const nameError = validateName(input.name);
    const emailError = validateEmail(input.email);
    const passwordError = validatePassword(input.password);

    if (nameError) errors.name = nameError;
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;

    return buildResult(errors, values);
}

function validateLoginInput(input = {}) {
    const values = {
        email: normalizeEmail(input.email)
    };
    const errors = {};

    const emailError = validateEmail(input.email);
    const passwordError = validateLoginPassword(input.password);

    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;

    return buildResult(errors, values);
}

function validateAccountInput(input = {}) {
    const values = {
        name: normalizeName(input.name),
        email: normalizeEmail(input.email)
    };
    const errors = {};

    const nameError = validateName(input.name);
    const emailError = validateEmail(input.email);

    if (nameError) errors.name = nameError;
    if (emailError) errors.email = emailError;

    return buildResult(errors, values);
}

module.exports = {
    MAX_EMAIL_LENGTH,
    MAX_NAME_LENGTH,
    MAX_PASSWORD_LENGTH,
    MIN_NAME_LENGTH,
    MIN_PASSWORD_LENGTH,
    normalizeEmail,
    normalizeName,
    validateAccountInput,
    validateLoginInput,
    validateRegistrationInput
};
