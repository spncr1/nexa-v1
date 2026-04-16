const express = require('express')
const app = express()
const bcrypt = require('bcrypt') // needed to facilitate password hashing

app.use(express.json()) // allows our application to accept JSON

const users = [] /* where we're storing our users (for now, this will be upgraded to integrate the PostgreSQL DB later) */

app.get('/users', (req, res) => { //request, response
    res.json(users) //send our users
});

/* handles for creating a user, hashing the password they send, and saving this into our users variable (list) */
app.post('/users', async (req, res) => {
    try {
        const hashed_password = await bcrypt.hash(req.body.password, 10) // 10 by default
        const user = { name: req.body.name, password: hashed_password }
        users.push(user)
        res.status(201).send() // sends a blank response back to the user
        // hash(salt + 'password') - salt is a unique, random string generated for each password. without it, identical passwords produce identical hashes. we don't have to use this line of code here, its more of an example, for this project, we will use bcrypt
    } catch { // in case something goes wrong
        res.status(500).send()
    }
});

app.post('/users/login', async(req, res) => {
    const user = users.find(user => user.name = req.body.name) // trying to find a particular user based on the name we pass in
    if (user == null) { // if user does not exist
        return res.status(400).send('Cannot find user')
    }

    try {
        if (await bcrypt.compare(req.body.password, user.password)) { //user.password is the hashed version of the password, where this if statement checks if the passwords are the same, and if they are, then the user is logged in
            res.status(500).send() // success
        } else {
            res.send('Not allowed')
        }
    } catch {
        res.status(500).send()
    }
});

app.listen(3000)