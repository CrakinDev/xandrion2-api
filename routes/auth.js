const router = require('express').Router()
const passport = require('passport')
const { route } = require('./discord')

router.get('/discord', passport.authenticate('discord'))

router.get('/discord/redirect', passport.authenticate('discord'), (req, res) => {
    if(req.user.bungieAcct)
    {
        res.redirect(`${process.env.FRONTEND_HOST}/dashboard/${req.user.bungieAcct}`)
    }
    else
    {
        console.log(req.user.discordId)
        res.redirect(`${process.env.FRONTEND_HOST}/register/${req.user.discordId}`)
    }
})

router.get('/', (req, res) => {
    if(req.user)
    {
        res.send(req.user)
    }
    else
    {
        res.status(401).send({msg: 'Unauthorized'})
    }
    
})

module.exports = router