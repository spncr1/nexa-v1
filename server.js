/*
    handles Express routes and middleware (auth)
*/
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express')
const path = require('path')
const dns = require('dns').promises
const crypto = require('crypto')
const app = express()
const bcrypt = require('bcrypt') // needed to facilitate password hashing
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const PgSession = require('connect-pg-simple')(session)
const methodOverride = require('method-override')
const {
    createAuthToken,
    createUser,
    deleteUserById,
    ensureDatabaseSchema,
    findUserByEmail,
    findUserById,
    findValidAuthToken,
    formatDbError,
    getUserAppState,
    invalidateAuthTokens,
    pool,
    resetPasswordWithAuthToken,
    saveUserAppState,
    testDatabaseConnection,
    updateUserById
} = require('./db')
const {
    validateAccountInput,
    validateForgotPasswordInput,
    validateLoginInput,
    validatePasswordResetInput,
    validateRegistrationInput
} = require('./auth-validation')
const {
    assertEmailConfiguration,
    sendPasswordResetEmail
} = require('./mailer')

const initialisePassport = require('./passport.config')
initialisePassport(
    passport, 
    findUserByEmail,
    findUserById
)

const PASSWORD_RESET_PURPOSE = 'password_reset'
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000
const FORGOT_PASSWORD_SUCCESS_MESSAGE = 'If an account exists for that email, a password reset link has been sent.'

let startupPromise = null

function ensureAppReady() {
    if (!startupPromise) {
        startupPromise = (async () => {
            await testDatabaseConnection()
            console.log('Database connection OK')
            await ensureDatabaseSchema()
            console.log('Database schema OK')
        })().catch((error) => {
            startupPromise = null
            throw error
        })
    }

    return startupPromise
}

function renderLogin(res, options = {}) {
    res.status(options.status || 200).render('pages/auth/login.ejs', {
        values: options.values || {},
        errors: options.errors || {},
        formError: options.formError || null,
        successMessage: options.successMessage || null
    })
}

function renderRegister(res, options = {}) {
    res.status(options.status || 200).render('pages/auth/register.ejs', {
        values: options.values || {},
        errors: options.errors || {},
        formError: options.formError || null
    })
}

function renderForgotPassword(res, options = {}) {
    res.status(options.status || 200).render('pages/auth/forgot-password.ejs', {
        values: options.values || {},
        errors: options.errors || {},
        formError: options.formError || null,
        successMessage: options.successMessage || null
    })
}

function renderResetPassword(res, options = {}) {
    res.status(options.status || 200).render('pages/auth/reset-password.ejs', {
        token: options.token || '',
        errors: options.errors || {},
        formError: options.formError || null,
        canReset: options.canReset !== false
    })
}

function getEmailDomain(email) {
    return String(email || '').split('@')[1] || ''
}

function hashAuthToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex')
}

function createRawAuthToken() {
    return crypto.randomBytes(32).toString('hex')
}

function getAppBaseUrl() {
    if (!process.env.APP_BASE_URL) {
        const error = new Error('Missing APP_BASE_URL configuration')
        error.code = 'APP_BASE_URL_MISSING'
        throw error
    }

    return process.env.APP_BASE_URL
}

function createPasswordResetUrl(token) {
    return new URL(`/reset-password/${token}`, getAppBaseUrl()).toString()
}

const DEFINITE_EMAIL_DOMAIN_FAILURE_CODES = new Set(['ENOTFOUND', 'ENODATA', 'ENODOMAIN'])

async function validateEmailDomain(email) {
    const domain = getEmailDomain(email)

    if (!domain) {
        return 'Enter a valid email address.'
    }

    try {
        const records = await dns.resolveMx(domain)

        if (!records.length) {
            return 'Email domain cannot receive mail.'
        }

        return null
    } catch (error) {
        if (DEFINITE_EMAIL_DOMAIN_FAILURE_CODES.has(error.code)) {
            return 'Email domain cannot receive mail.'
        }

        console.error('Email domain verification failed:', error.code || error.message)
        return null
    }
}

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.set('trust proxy', 1)
app.use(express.urlencoded( { extended: false })) // allows us to take the forms in our ejs files and then be able to access them inside of our request variable inside of our POST method
app.use(session({
    store: new PgSession({
        pool,
        tableName: 'session',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    }
}));
app.use(flash())
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))
app.use(express.json()) // allows our application to accept JSON
app.use(async (req, res, next) => {
    try {
        await ensureAppReady()
        next()
    } catch (error) {
        console.error('App startup check failed:', formatDbError(error))
        res.status(500).send('Application startup failed')
    }
})

app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        return res.render('pages/index.ejs')
    }

    res.redirect('/login')
});

const APP_PAGE_ROUTES = {
    '/tasks': 'pages/features/tasks.ejs',
    '/assignments': 'pages/features/assignments.ejs',
    '/study-planner': 'pages/features/study-planner.ejs',
    '/habits': 'pages/features/habits.ejs',
    '/job-applications': 'pages/features/job-applications.ejs',
    '/finances': 'pages/features/finances.ejs'
}

const LEGACY_APP_PAGE_REDIRECTS = {
    '/client/features/Tasks/tasks.html': '/tasks',
    '/client/features/Assignments/assignments.html': '/assignments',
    '/client/features/StudyPlanner/study-planner.html': '/study-planner',
    '/client/features/Habits/habits.html': '/habits',
    '/client/features/JobApplications/job-applications.html': '/job-applications',
    '/client/features/Finances/finances.html': '/finances'
}

Object.entries(APP_PAGE_ROUTES).forEach(([route, view]) => {
    app.get(route, checkAuthenticated, (req, res) => {
        res.render(view)
    })
})

Object.entries(LEGACY_APP_PAGE_REDIRECTS).forEach(([legacyRoute, route]) => {
    app.get(legacyRoute, checkAuthenticated, (req, res) => {
        res.redirect(route)
    })
})

app.get('/login', checkNotAuthenticated, (req, res) => {
    renderLogin(res, {
        successMessage: req.flash('success')[0],
        formError: req.flash('error')[0]
    })
});

app.get('/register', checkNotAuthenticated, (req, res) => {
    renderRegister(res, {
        formError: req.flash('error')[0]
    })
});

app.get('/forgot-password', checkNotAuthenticated, (req, res) => {
    renderForgotPassword(res)
});

app.get('/reset-password/:token', checkNotAuthenticated, async (req, res) => {
    try {
        const tokenHash = hashAuthToken(req.params.token)
        const resetToken = await findValidAuthToken(PASSWORD_RESET_PURPOSE, tokenHash)

        if (!resetToken) {
            return renderResetPassword(res, {
                status: 400,
                token: req.params.token,
                formError: 'This password reset link is invalid or has expired.',
                canReset: false
            })
        }

        renderResetPassword(res, { token: req.params.token })
    } catch (error) {
        console.error('Failed to load password reset page:', formatDbError(error))
        renderResetPassword(res, {
            status: 500,
            token: req.params.token,
            formError: 'Could not load password reset right now.',
            canReset: false
        })
    }
});

app.post('/login', checkNotAuthenticated, (req, res, next) => {
    const validation = validateLoginInput(req.body)

    if (!validation.isValid) {
        return renderLogin(res, {
            status: 422,
            values: validation.values,
            errors: validation.errors,
            formError: 'Please fix the highlighted fields.'
        })
    }

    passport.authenticate('local', (error, user, info) => {
        if (error) {
            return next(error)
        }

        if (!user) {
            return renderLogin(res, {
                status: 401,
                values: validation.values,
                formError: info?.message || 'Email or password is incorrect.'
            })
        }

        req.login(user, (loginError) => {
            if (loginError) {
                return next(loginError)
            }

            return res.redirect('/')
        })
    })(req, res, next)
})

app.post('/forgot-password', checkNotAuthenticated, async (req, res) => {
    const validation = validateForgotPasswordInput(req.body)

    if (!validation.isValid) {
        return renderForgotPassword(res, {
            status: 422,
            values: validation.values,
            errors: validation.errors,
            formError: 'Please fix the highlighted fields.'
        })
    }

    try {
        assertEmailConfiguration()
        const user = await findUserByEmail(validation.values.email)

        if (!user) {
            return renderForgotPassword(res, {
                successMessage: FORGOT_PASSWORD_SUCCESS_MESSAGE
            })
        }

        const rawToken = createRawAuthToken()
        const tokenHash = hashAuthToken(rawToken)
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS)

        await createAuthToken({
            userId: user.id,
            purpose: PASSWORD_RESET_PURPOSE,
            tokenHash,
            expiresAt
        })

        try {
            await sendPasswordResetEmail({
                to: user.email,
                name: user.name,
                resetUrl: createPasswordResetUrl(rawToken)
            })
        } catch (error) {
            await invalidateAuthTokens(user.id, PASSWORD_RESET_PURPOSE)
            throw error
        }

        renderForgotPassword(res, {
            successMessage: FORGOT_PASSWORD_SUCCESS_MESSAGE
        })
    } catch (error) {
        console.error('Failed to send password reset email:', formatDbError(error))
        renderForgotPassword(res, {
            status: 500,
            values: validation.values,
            formError: 'Could not send a password reset email right now.'
        })
    }
})

app.post('/reset-password/:token', checkNotAuthenticated, async (req, res) => {
    const validation = validatePasswordResetInput(req.body)

    if (!validation.isValid) {
        return renderResetPassword(res, {
            status: 422,
            token: req.params.token,
            errors: validation.errors
        })
    }

    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const updatedUser = await resetPasswordWithAuthToken({
            purpose: PASSWORD_RESET_PURPOSE,
            tokenHash: hashAuthToken(req.params.token),
            passwordHash: hashedPassword
        })

        if (!updatedUser) {
            return renderResetPassword(res, {
                status: 400,
                token: req.params.token,
                formError: 'This password reset link is invalid or has expired.',
                canReset: false
            })
        }

        req.flash('success', 'Password updated successfully. You can log in now.')
        res.redirect('/login')
    } catch (error) {
        console.error('Failed to reset password:', formatDbError(error))
        renderResetPassword(res, {
            status: 500,
            token: req.params.token,
            formError: 'Could not reset your password right now.'
        })
    }
})

app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
        const validation = validateRegistrationInput(req.body)

        if (!validation.isValid) {
            return renderRegister(res, {
                status: 422,
                values: validation.values,
                errors: validation.errors,
                formError: 'Please fix the highlighted fields.'
            })
        }

        const emailDomainError = await validateEmailDomain(validation.values.email)
        if (emailDomainError) {
            return renderRegister(res, {
                status: 422,
                values: validation.values,
                errors: { email: emailDomainError },
                formError: 'Please fix the highlighted fields.'
            })
        }

        const existingUser = await findUserByEmail(validation.values.email)
        if (existingUser) {
            return renderRegister(res, {
                status: 409,
                values: validation.values,
                errors: { email: 'An account with that email already exists.' },
                formError: 'Please fix the highlighted fields.'
            })
        }

        const hashed_password = await bcrypt.hash(req.body.password, 10);

        await createUser({
            name: validation.values.name,
            email: validation.values.email,
            passwordHash: hashed_password
        })

        req.flash('success', 'Account created successfully. You can log in now.')
        res.redirect('/login') // redirect to login page so user can login with the account they just registered
    } catch (error) {
        console.error('Failed to register user:', formatDbError(error))
        req.flash('error', 'Could not create account right now')
        res.redirect('/register') // redirect to register in case of a failure
    }
});

app.delete('/logout', (req, res, next) => {
    req.logout(function(err) {
        if (err) {
            return next(err)
        }
        req.session.destroy((sessionError) => {
            if (sessionError) {
                return next(sessionError)
            }

            res.clearCookie('connect.sid')
            res.status(204).send()
        })
    })
});

app.get('/api/me', checkAuthenticatedApi, (req, res) => {
    res.json({
        id: req.user.id,
        name: req.user.name,
        email: req.user.email
    })
})

app.patch('/api/me', checkAuthenticatedApi, async (req, res) => {
    try {
        const validation = validateAccountInput(req.body)

        if (!validation.isValid) {
            return res.status(422).json({
                error: 'Name and email must be valid.',
                errors: validation.errors
            })
        }

        if (validation.values.email !== req.user.email) {
            const emailDomainError = await validateEmailDomain(validation.values.email)
            if (emailDomainError) {
                return res.status(422).json({
                    error: 'Name and email must be valid.',
                    errors: { email: emailDomainError }
                })
            }
        }

        const existingUser = await findUserByEmail(validation.values.email)
        if (existingUser && String(existingUser.id) !== String(req.user.id)) {
            return res.status(409).json({
                error: 'That email is already in use',
                errors: { email: 'That email is already in use.' }
            })
        }

        const updatedUser = await updateUserById(req.user.id, validation.values)
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' })
        }

        req.login(updatedUser, (loginError) => {
            if (loginError) {
                console.error('Failed to refresh session user:', formatDbError(loginError))
                return res.status(500).json({ error: 'Could not refresh session right now' })
            }

            return res.json({
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email
            })
        })
    } catch (error) {
        console.error('Failed to update user account:', formatDbError(error))
        res.status(500).json({ error: 'Could not update account right now' })
    }
})

app.delete('/api/me', checkAuthenticatedApi, async (req, res, next) => {
    try {
        const deletedUser = await deleteUserById(req.user.id)
        if (!deletedUser) {
            return res.status(404).json({ error: 'User not found' })
        }

        req.logout(function(logoutError) {
            if (logoutError) {
                return next(logoutError)
            }

            req.session.destroy((sessionError) => {
                if (sessionError) {
                    return next(sessionError)
                }

                res.clearCookie('connect.sid')
                res.status(200).json({ success: true })
            })
        })
    } catch (error) {
        console.error('Failed to delete user account:', formatDbError(error))
        res.status(500).json({ error: 'Could not delete account right now' })
    }
})

app.get('/api/app-state', checkAuthenticatedApi, async (req, res) => {
    try {
        const storage = await getUserAppState(req.user.id)

        if (!storage.studenthub_user_name && req.user.name) {
            storage.studenthub_user_name = req.user.name
        }

        res.json({ storage })
    } catch (error) {
        console.error('Failed to load app state:', formatDbError(error))
        res.status(500).json({ error: 'Could not load app data right now' })
    }
})

app.put('/api/app-state', checkAuthenticatedApi, async (req, res) => {
    try {
        const incomingStorage = req.body?.storage
        const storage = incomingStorage && typeof incomingStorage === 'object' ? incomingStorage : {}

        if (!storage.studenthub_user_name && req.user.name) {
            storage.studenthub_user_name = req.user.name
        }

        const savedStorage = await saveUserAppState(req.user.id, storage)
        res.json({ storage: savedStorage })
    } catch (error) {
        console.error('Failed to save app state:', formatDbError(error))
        res.status(500).json({ error: 'Could not save app data right now' })
    }
})

app.get('/index.html', checkAuthenticated, (req, res) => {
    res.redirect('/')
})
app.use(express.static(path.join(__dirname, 'public')))

//middleware function
function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    }
    next()
}

function checkAuthenticatedApi(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    res.status(401).json({ error: 'Not authenticated' })
}

const PORT = process.env.PORT || 3000
const LOCAL_LOGIN_URL = `http://localhost:${PORT}/login`

async function startServer() {
    try {
        await ensureAppReady()

        app.listen(PORT, () => {
          console.log(`Nexa is running at ${LOCAL_LOGIN_URL}`)
        })
    } catch (error) {
        console.error('Database startup check failed:', formatDbError(error))
        process.exit(1)
    }
}

if (require.main === module) {
    startServer()
}

module.exports = app
