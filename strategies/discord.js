const passport = require('passport')
const DiscordStrategy = require('passport-discord')
const mongo = require('../database/mongo')
const User = require('../database/schemas/User')

passport.serializeUser((user, done) => {
    done(null, user.discordId)
})

passport.deserializeUser(async (discordId, done) => {
    try
    {
        const user = await User.find({discordId})
        return user ? done(null, user) : done(null, null)
    }
    catch(err)
    {
        console.log(err)
        done(err, null)
    }
})

passport.use(
    new DiscordStrategy(
        {
            clientID: process.env.DASHBOARD_CLIENT_ID,
            clientSecret: process.env.DASHBOARD_CLIENT_SECRET,
            callbackURL: process.env.DASHBOARD_CALLBACK_URL,
            scope: ['identify', 'guilds']
        }, 
        async(accessToken, refreshToken, profile, done) => {
            const { id, username, discriminator, avatar, guilds} = profile
            await mongo().then(async (mongoose) => {
                try
                {
                    const findUser = await User.findOneAndUpdate(
                        {
                            discordId: id
                        },
                        {
                            discordTag: `${username}#${discriminator}`,
                            avatar,
                            guilds
                        },
                        {
                            upsert: true,
                            new: true
                        })
                    if(findUser)
                    {
                        console.log('User was found')
                        return done(null, findUser)
                    }
                }
                catch(err)
                {
                    console.log(err)
                    done(err, null)
                }
            })
    })
)