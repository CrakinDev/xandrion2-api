const router = require('express').Router()

const BungieLib = require( 'bungie-net-api' )

const mongo = require('../../database/mongo')
const discordGuardianSchema = require("../../database/schemas/User")
const guardianActivitySchema = require('../../database/schemas/guardian-activity-schema')

router.get('/:bungieAcct/:activityId', async (req, res) => {
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
    await mongo().then(async (mongoose) => {
        try
        {
            fetchedAccountData = await discordGuardianSchema.findOne({ bungieAcct: req.params.bungieAcct })

            // If account data is still not found, user is not registered.
            if(!fetchedAccountData)
            {
                res.send(null)
                return
            }
        }
        finally
        {
            mongoose.connection.close()
        }
    })

    let activityPromises = []
    let allActivityData = []
    const bungieApi = new BungieLib({"key" : process.env.BUNGIE_KEY, "clientId" : process.env.BUNGIE_CLIENT_ID, "clientSecret" : process.env.BUNGIE_CLIENT_SECRET})

    
    fetchedAccountData.characterIds.forEach((charId) => {
        activityPromises.push(bungieApi.Destiny2.getActivityHistory({ 'characterId' : charId, 'destinyMembershipId' : fetchedAccountData.bungieAcct, 'membershipType' : 1, 'count' : 10, 'mode' : req.params.activityId, 'page' : 0 }))
    })

    await Promise.all(activityPromises).then((actData) => {
        try
        {
            actData.forEach((data) => {
                if(!data.ErrorCode === 1 || JSON.stringify(data.Response) === "{}")
                {
                    ErrorCode = data.ErrorCode
                    ErrorStatus = (data.ErrorCode !== 1) ? data.ErrorStatus : 'No ' + getActivityType(activityMode) + ' data available.'
                }
                // Combine all data into a single array to be sorted/processed
                allActivityData = allActivityData.concat(data.Response.activities)
            })
            
            // Sort data to get the latest 10 activities (10 is current application limit)
            allActivityData.sort((a, b) => {
                const aTime = new Date(a.period)
                const bTime = new Date(b.period)
                return aTime.getTime() < bTime.getTime()
            })
        }
        catch(e)
        {
            console.log(e)
        }                
    })

    await mongo().then(async (mongoose) => {
        try
        {
            // Ensure we are only storing the last 10 activities of a type
            // Currently just deletes all 10 stored entries and replaces it with API query result
            await guardianActivitySchema.deleteMany(
                {
                    accountId: req.params.bungieAcct,
                    mode: req.params.activityId
                }
            )
            // Loop through 10 most recent activities fetched, if available.
            // If a player has not played 10 activities of the type requested, parse as many as we can.
            let activitiesArray = []
            let activityLength = allActivityData.length
            if(activityLength >= 10)
            {
                activityLength = 10
            }
            else
            {
                actCount = activityLength
            }

            allActivityData.slice(0, activityLength).forEach(activity => {
                // Add relevant activity data to array of objects
                activitiesArray.push(
                    {
                        accountId: req.params.bungieAcct,
                        timestamp: activity.period,
                        directorActivityHash: activity.activityDetails.directorActivityHash,
                        instanceId: activity.activityDetails.instanceId,
                        mode: activity.activityDetails.mode,
                        platform: activity.activityDetails.membershipType,
                        assists: activity.values.assists.basic.value,
                        deaths: activity.values.deaths.basic.value,
                        kills: activity.values.kills.basic.value,
                        efficiency: activity.values.efficiency.basic.value,
                        kdr: activity.values.killsDeathsRatio.basic.value,
                        kdar: activity.values.killsDeathsAssists.basic.value,
                        score: activity.values.score.basic.value,
                        activityDurationSeconds: activity.values.activityDurationSeconds.basic.value
                    })
                }
            )
            
            
            // Insert fetched activity data to database collection
            await guardianActivitySchema.insertMany(activitiesArray)

            console.log("Sending Response: ")
            console.log(JSON.stringify(activitiesArray))
            res.send(JSON.stringify(activitiesArray))
        }
        finally
        {
            mongoose.connection.close()
        }
    })

    
})

getActivityType = (activityMode) => {
    let activityName = ''
    
    switch(activityMode)
    {
        // PVE Activities
        case bungieApi.Destiny2.Enums.destinyActivityModeType.STRIKE:
            activityName = 'Strike'
            break
        case bungieApi.Destiny2.Enums.destinyActivityModeType.RAID:
            activityName = 'Raid'
            break
        case bungieApi.Destiny2.Enums.destinyActivityModeType.ALLPVE:
            activityName = 'PvE'
            break
        case bungieApi.Destiny2.Enums.destinyActivityModeType.SCOREDNIGHTFALL:
            activityName = 'Nightfall'
            break
        
        // PVP Activities
        case bungieApi.Destiny2.Enums.destinyActivityModeType.ALLPVP:
            activityName = 'Crucible'
            break
        case bungieApi.Destiny2.Enums.destinyActivityModeType.CONTROL:
            activityName = 'Control'
            break
        case bungieApi.Destiny2.Enums.destinyActivityModeType.CLASH:
            activityName = 'Clash'
            break
        case bungieApi.Destiny2.Enums.destinyActivityModeType.ALLMAYHEM:
            activityName = 'Mayhem'
            break
        case bungieApi.Destiny2.Enums.destinyActivityModeType.SUPREMACY:
            activityName = 'Supremacy'
            break
        case bungieApi.Destiny2.Enums.destinyActivityModeType.SURVIVAL:
            activityName = 'Survival'
            break
        case bungieApi.Destiny2.Enums.destinyActivityModeType.COUNTDOWN:
            activityName = 'Countdown'
            break
        case bungieApi.Destiny2.Enums.destinyActivityModeType.RUMBLE:
            activityName = 'Rumble'
            break
        case bungieApi.Destiny2.Enums.destinyActivityModeType.ALLDOUBLES:
            activityName = 'Doubles'
            break
        case bungieApi.Destiny2.Enums.destinyActivityModeType.SHOWDOWN:
            activityName = 'Showdown'
            break
        case bungieApi.Destiny2.Enums.destinyActivityModeType.LOCKDOWN:
            activityName = 'Lockdown'
            break
        case bungieApi.Destiny2.Enums.destinyActivityModeType.SCORCHED:
            activityName = 'Scorched'
            break
        case bungieApi.Destiny2.Enums.destinyActivityModeType.ELIMINATION:
            activityName = 'Elimination'
            break
        
        // Specialty PVP Activities
        case bungieApi.Destiny2.Enums.destinyActivityModeType.IRONBANNER:
            activityName = 'Iron Banner'
            break
        case bungieApi.Destiny2.Enums.destinyActivityModeType.TRIALSOFOSIRIS:
            activityName = 'Trials of Osiris'
            break
    }
    return activityName
}

module.exports = router