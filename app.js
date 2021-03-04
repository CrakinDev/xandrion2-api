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

// Initialize Express for API Server support
app.use(express.json())

// Initialize CORS support
app.use(cors({
    origin: process.env.FRONTEND_HOST,
    credentials: true
}))

// Initialize Session for session saving support
app.use(session({
    secret: process.env.DASHBOARD_SECRET,
    cookie: {
        maxAge: 86400000
    },
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: 'strict' },
    store: MongoStore.create(
        {
            mongoUrl: process.env.MONGO_PATH,
            useUnifiedTopology: true,
            useNewUrlParser: true,
            collectionName: 'dashboard-sessions'
        }
    )
}))

// Initialize Passport for OAuth2 support
app.use(passport.initialize())
app.use(passport.session())

// Base API route
app.use('/api', routes)



app.listen(PORT, () => console.log(`Running on Port ${PORT}`))