const mongoose = require('mongoose');

const scribblyStudentWorkSchema = new mongoose.Schema({
    studentWork: Buffer,
    author: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    curTaskDesc: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        default: 'free'
    },
    score: {
        type: Number,
        default: -1
    },
    tryCount: {
        type: Number,
        default: 1
    },
    teacherComment: String,
    takenDate: Date,
    duration: Number,
    wowReact: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    hahaReact: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    loveReact: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
});

const ScribblyStudentWork = mongoose.model('ScribblyStudentWork', scribblyStudentWorkSchema);

module.exports = ScribblyStudentWork;