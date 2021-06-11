const mongoose = require('mongoose');


const classSchema = new mongoose.Schema({
    classId: {
        type: String,
        required: true,
        unique: true
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
            required: true,
            refPath: 'quizList.quizType'
        },
        quizType: {
            type: String,
            required: true,
            enum: ['PicQuizz', 'Quiz', 'Skrible']
        }
    }]
});

classSchema.methods.toJSON = function() {
    const user = this;

    delete user.quizList;
    const userObject = user.toObject();

    return userObject;
}

const Class = mongoose.model('Class', classSchema);

module.exports = Class;