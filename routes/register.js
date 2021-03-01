const router = require('express').Router()

const BungieLib = require( 'bungie-net-api' )

const discordGuardianSchema = require("../database/schemas/User")

router.get('/:discordId', (req, res) => {
    res.send({
        msg:'Register'
    })
})

router.post('/:discordId', async (req, res) => {
    let username = req.body.NAME
    let platform = req.body.PLATFORM
    let discordId = req.params.discordId
    let error = 'OK'
    let errorCode = 1
    let bMembershipId = ''

    // Check data from Bungie API (find Guardian data)
    const bungieApi = new BungieLib({"key" : process.env.BUNGIE_KEY, "clientId" : process.env.BUNGIE_CLIENT_ID, "clientSecret" : process.env.BUNGIE_CLIENT_SECRET})

    // Bungie API Call
    await bungieApi.Destiny2.searchPlayer( username, platform ).then(async (acctData) => {
    console.log(acctData.Response[0])               

        // If Bungie Response is valid
        if(acctData.ErrorCode === 1)
        {
            bMembershipId = acctData.Response[0].membershipId
            await bungieApi.Destiny2.getProfile( bMembershipId, platform ).then(async (charData) => { 
                if(charData.ErrorCode === 1)
                {
                    // Mongo Write
                    console.log("Writing Guardian Data")
                    await discordGuardianSchema.findOneAndUpdate(
                        {
                            discordId: discordId
                        },
                        {
                            discordId: discordId,
                            platform: platform,
                            name: username,
                            bungieAcct: bMembershipId,
                            characterIds: charData.Response.profile.data.characterIds
                        },
                        {
                            upsert: true
                        }
                    )
                }
                else
                {
                   // Bungie API Error
                   error = charData.ErrorStatus
                   errorCode = charData.ErrorCode
                }
            })
        }
        else
        {
            // Bungie API Error
            error = charData.ErrorStatus
            errorCode = charData.ErrorCode
        }
    })

    // Send Response
    if(errorCode === 1)
    {
        res.status(200).json({errorCode: errorCode, errorStatus: error, bungieAcct: bMembershipId}).send()
    }
})

module.exports = router