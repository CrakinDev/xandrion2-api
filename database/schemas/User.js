const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    discordId: {
        type: String,
        required: true,
        unique: true
    },
    discordTag: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        required: true
    },
    guilds: {
        type: Array,
        required: true
    },
    bungieAcct: {
        type: String,
        required: false,
    },
    characterIds: {
        type: Array,
        required: false,
    },
    bungieName: {
        type: String,
        required: false,
    },
    bungiePlatform: {
        type: String,
        required: false
    }

})

module.exports = mongoose.model('discord-users', UserSchema)