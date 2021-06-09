const mongoose = require('mongoose');


const classSchema = new mongoose.Schema({
    classId: {
        type: String,
        required: true
    },
    className: {
        type: String
    },
    studentList: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    quizList: [{
        quiz: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'quizType'
        },
        quizType: {
            type: String,
            required: true,
            enum: ['PicQuiz', 'Quiz', 'Skrible']
        }
    }]
});


const Class = mongoose.model('Class', classSchema);

module.exports = Class;