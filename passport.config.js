/*
    handles authentication logic
*/

const localStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const { normalizeEmail } = require('./auth-validation')

const INVALID_LOGIN_MESSAGE = 'Email or password is incorrect.'

function initialize(passport, getUserByEmail, getUserById) {
    const authenticateUser = async (email, password, done) => { // call "done" when we're done authenticating our user
        try {
            const user = await getUserByEmail(normalizeEmail(email))
            if (user == null) {
                return done(null, false, { message: INVALID_LOGIN_MESSAGE })
            }

            if (await bcrypt.compare(password, user.password)) {
                return done(null, user)
            } else {
                return done(null, false, { message: INVALID_LOGIN_MESSAGE }) // false for no user found (passwords did not match)
            }
        } catch (e) {
            return done(e)
        }
    }
    passport.use(new localStrategy({ usernameField: 'email' }, authenticateUser))
    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await getUserById(id)
            return done(null, user)
        } catch (e) {
            return done(e)
        }
    })
}

module.exports = initialize
