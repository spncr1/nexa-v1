/*
    handles Express routes and middleware (auth)
*/
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express')
const path = require('path')
const dns = require('dns').promises
const app = express()
const bcrypt = require('bcrypt') // needed to facilitate password hashing
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const PgSession = require('connect-pg-simple')(session)
const methodOverride = require('method-override')
const {
    createUser,
    deleteUserById,
    ensureDatabaseSchema,
    findUserByEmail,
    findUserById,
    formatDbError,
    getUserAppState,
    pool,
    saveUserAppState,
    testDatabaseConnection,
    updateUserById
} = require('./db')
const {
    validateAccountInput,
    validateLoginInput,
    validateRegistrationInput
} = require('./auth-validation')

const initialisePassport = require('./passport.config')
initialisePassport(
    passport, 
    findUserByEmail,
    findUserById
)

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
    res.status(options.status || 200).render('login.ejs', {
        values: options.values || {},
        errors: options.errors || {},
        formError: options.formError || null,
        successMessage: options.successMessage || null
    })
}

function renderRegister(res, options = {}) {
    res.status(options.status || 200).render('register.ejs', {
        values: options.values || {},
        errors: options.errors || {},
        formError: options.formError || null
    })
}

function getEmailDomain(email) {
    return String(email || '').split('@')[1] || ''
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
        return res.render('index.ejs')
    }

    res.redirect('/login')
});

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
app.get('/client/features/:featureName/:pageName.html', checkAuthenticated, sendProtectedHtml)
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

function sendProtectedHtml(req, res) {
    res.sendFile(path.join(__dirname, 'public', req.path))
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
