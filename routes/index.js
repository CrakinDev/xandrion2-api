const router = require('express').Router()
const auth = require('./auth')
const discord = require('./discord')
const strikes = require('./stats/activities')

router.use('/auth', auth)
router.use('/discord', discord)
router.use('/stats/activities', strikes)

module.exports = router