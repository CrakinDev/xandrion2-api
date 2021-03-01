require('dotenv').config()
require('./strategies/discord')

const express = require('express')                  // Server dependency
const passport = require('passport')                // oAuth2 Token Handling
const mongoose = require('mongoose')                // MongoDB connection handling
const session = require('express-session')          // Session/cookie handling
const MongoStore = require('connect-mongo').default    // Mongo Session Storage
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 8081
const routes = require('./routes')

mongoose.connect(process.env.MONGO_PATH, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

app.use(express.json())

app.use(cors({
    origin: process.env.FRONTEND_HOST + ':' + process.env.FRONTEND_PORT,
    credentials: true
}))

app.use(session({
    secret: process.env.DASHBOARD_SECRET,
    cookie: {
        maxAge: 86400000
    },
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create(
        {
            mongoUrl: process.env.MONGO_PATH,
            useUnifiedTopology: true,
            useNewUrlParser: true,
            collectionName: 'dashboard-sessions'
        }
    )
}))
app.use(passport.initialize())
app.use(passport.session())

// Base API route
app.use('/api', routes)



app.listen(PORT, () => console.log(`Running on Port ${PORT}`))