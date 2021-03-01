const router = require('express').Router()
const auth = require('./auth')
const discord = require('./discord')
const register = require('./register')
const activities = require('./stats/activities')

router.use('/auth', auth)
router.use('/discord', discord)
router.use('/register', register)
router.use('/stats/activities', activities)

module.exports = router