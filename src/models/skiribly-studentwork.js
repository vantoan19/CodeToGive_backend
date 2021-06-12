const mongoose = require('mongoose');

const skriblyStudentWorkSchema = new mongoose.Schema({
    studentWork: {
        type: Buffer,
        required: true
    },
    author: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    curStudent: {
        type: Number,
        default: 0
    },
    score: {
        type: Number,
        default: -1
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

const SkriblyStudentWork = mongoose.model('SkriblyStudentWork', skriblyStudentWorkSchema);

module.exports = SkriblyStudentWork;