const router = require('express').Router()

const BungieLib = require( 'bungie-net-api' )

const mongo = require('../../database/mongo')
const discordGuardianSchema = require("../../database/schemas/User")
const guardianActivitySchema = require('../../database/schemas/guardian-activity-schema')
const bungieApi = new BungieLib({"key" : process.env.BUNGIE_KEY, "clientId" : process.env.BUNGIE_CLIENT_ID, "clientSecret" : process.env.BUNGIE_CLIENT_SECRET}, ['destiny2'])
bungieApi.Destiny2.init(['en'])

router.get('/:bungieAcct/:platform', async (req, res) => {
    // if(req.user)
    // {
    //     res.send(
    //     {
    //         msg:'Activities Endpoint',
    //         acct:req.params.bungieAcct,
    //         activity:req.params.activityId
    //     })
    // }
    // else
    // {
    //     res.status(401).send({msg: 'Unauthorized'})
    // }

    let ErrorCode = 1
    let ErrorStatus = 'OK'
    // Account info does not exist in cache, fetch from db instance.
    let fetchedAccountData = {}

    await bungieApi.Destiny2.getProfile(req.params.bungieAcct, req.params.platform, ['PROFILES', 'CHARACTERS'])
        .then((data) => {
            console.log(data)
            res.send(JSON.stringify(data))
        })
    
})

module.exports = router