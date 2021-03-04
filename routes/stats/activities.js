const router = require('express').Router()

const BungieLib = require( 'bungie-net-api' )

const mongo = require('../../database/mongo')
const discordGuardianSchema = require("../../database/schemas/User")
const guardianActivitySchema = require('../../database/schemas/guardian-activity-schema')
const bungieApi = new BungieLib({"key" : process.env.BUNGIE_KEY, "clientId" : process.env.BUNGIE_CLIENT_ID, "clientSecret" : process.env.BUNGIE_CLIENT_SECRET}, ['destiny2'])
bungieApi.Destiny2.init(['en'])

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
    
    fetchedAccountData.characterIds.forEach((charId) => {
        activityPromises.push(bungieApi.Destiny2.getActivityHistory({ 'characterId' : charId, 'destinyMembershipId' : fetchedAccountData.bungieAcct, 'membershipType' : 1, 'mode' : req.params.activityId, 'count' : 10}))
    })

    await Promise.all(activityPromises).then((actData) => {
        try
        {
            // Activity data may be undefined if the Bungie API is down/under maintenance.
            if(actData !== undefined)
            {
                actData.forEach((data) => {
                    // Activity Data may be initialized to array of one or more undefined elements.
                    // While in the forEach, we can check for them as some characters may have played the activities being fetched while others have not.
                    if(data !== undefined)
                    {
                        // Check for ErrorCode response from the Bungie API.
                        if(!data.ErrorCode === 1 || JSON.stringify(data.Response) === "{}")
                        {
                            ErrorCode = data.ErrorCode
                            ErrorStatus = (data.ErrorCode !== 1) ? data.ErrorStatus : 'No data available.'
                        }
                        // Combine all data into a single array to be sorted/processed
                        allActivityData = allActivityData.concat(data.Response.activities)
                    }
                })
    
                // Sort data to get the latest 10 activities (10 is current application limit)
                allActivityData.sort((a, b) => {
                    const aTime = new Date(a.period)
                    const bTime = new Date(b.period)
                    return bTime - aTime
                })
                
                // Certain static data is returned as a hash from the API. We need to query the manifest to get that info.
                // In this case, we are getting the activity name from the returned hash value and querying the local manifest downloaded/read upon module initialization.
                // The name and icon are then attached to the activity object to be passed to the response.
                // Activity description and much more information is also available.
                allActivityData.forEach(activity => {
                    if(activity !== undefined)
                    {
                        const activityHashInfo = bungieApi.Destiny2.getDestinyManifestDefinition('DestinyActivityDefinition', activity.activityDetails.directorActivityHash)
                        activity.activityDetails.name = activityHashInfo.displayProperties.name
                        activity.activityDetails.icon = activityHashInfo.displayProperties.icon
                    }
                })
            }
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
            // if(activityLength >= 10)
            // {
            //     activityLength = 10
            // }
            // else
            // {
            //     actCount = activityLength
            // }

            allActivityData.slice(0, activityLength).forEach(activity => {
                if(activity !== undefined)
                {
                    // Add relevant activity data to array of objects
                    activitiesArray.push(
                    {
                        accountId: req.params.bungieAcct,
                        timestamp: activity.period,
                        name: activity.activityDetails.name,
                        icon: activity.activityDetails.icon,
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
            })
            
            
            // Insert fetched activity data to database collection
            await guardianActivitySchema.insertMany(activitiesArray)

            res.send(JSON.stringify(activitiesArray))
        }
        finally
        {
            //mongoose.connection.close()
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