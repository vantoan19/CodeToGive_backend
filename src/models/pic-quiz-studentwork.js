const mongoose = require('mongoose');

const picQuizStudentWorkSchema = new mongoose.Schema({
    answer: [String],
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    score: {
        type: Number,
        default: -1
    },
    teacherComment: String,
    takenDate: Date,
    duration: Number,
    tryCount: {
        type: Number,
        default: 1
    }
});

const PicQuizzStudentWork = mongoose.model('PicQuizzStudentWork', picQuizStudentWorkSchema);

module.exports = PicQuizzStudentWork;