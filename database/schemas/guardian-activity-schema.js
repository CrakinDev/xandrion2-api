const mongoose = require('mongoose')

const guardianActivitiesSchema = mongoose.Schema({
    accountId: {
        type: String,
        required: false
    },
    timestamp: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: false
    },
    icon: {
        type: String,
        required: false
    },
    instanceId: {
        type: String,
        required: true
    },
    mode: {
        type: String,
        required: false
    },
    platform: {
        type: String,
        required: false
    },
    assists: {
        type: Number,
        required: false
    },
    deaths: {
        type: Number,
        required: false
    },
    kills: {
        type: Number,
        required: false
    },
    efficiency: {
        type: Number,
        required: false
    },
    kdr: {
        type: Number,
        required: false
    },
    kdar: {
        type: Number,
        required: false
    },
    score: {
        type: Number,
        required: false
    },
    activityDurationSeconds: {
        type: Number,
        required: false
    }
})

module.exports = mongoose.model('guardian-activities', guardianActivitiesSchema)