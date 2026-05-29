/*
    handles Express routes and middleware (auth)
*/
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express')
const path = require('path')
const app = express()
const bcrypt = require('bcrypt') // needed to facilitate password hashing
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const PgSession = require('connect-pg-simple')(session)
const methodOverride = require('method-override')
const {
    createUser,
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
    res.render('login.ejs')
});

app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs')
});

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
        const existingUser = await findUserByEmail(req.body.email)
        if (existingUser) {
            req.flash('error', 'An account with that email already exists')
            return res.redirect('/register')
        }

        const hashed_password = await bcrypt.hash(req.body.password, 10);

        await createUser({
            name: req.body.name,
            email: req.body.email,
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
        const name = (req.body?.name || '').trim()
        const email = (req.body?.email || '').trim().toLowerCase()

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' })
        }

        const existingUser = await findUserByEmail(email)
        if (existingUser && String(existingUser.id) !== String(req.user.id)) {
            return res.status(409).json({ error: 'That email is already in use' })
        }

        const updatedUser = await updateUserById(req.user.id, { name, email })
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
