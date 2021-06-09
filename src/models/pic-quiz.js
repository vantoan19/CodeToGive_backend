const mongoose = require('mongoose');

const picQuizSchema = new mongoose.Schema({
    quizType: {
        type: String,
        default: 'Guess Pic Game'
    },
    quizId: {
        type: String,
        required: true,
        unique: true
    },
    quizName: {
        type: String,
        required: true
    },
    author: String,
    createdDate: Date,
    maxPoint: Number,
    numberOfAttempt: Number,
    maxTime: Number,
    dueDate: Date,
    classes: [String],
    bigQuestion: {
        type: String,
        required: true
    },
    bigAnswer: {
        type: String,
        required: true
    },
    bigQuestionImage: {
        type: Buffer,
        required: true
    },
    smallQuestions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
    }],
    participants: [{
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        score: Number,
        takenDate: Date,
        duration: Number
    }]
});

picQuizSchema.virtual('Small Questions', {
    ref: 'Question',
    localField: 'smallQuestions',
    foreignField: '_id'
});

picQuizSchema.virtual('Participants', {
    ref: 'User',
    localField: 'participants.participant',
    foreignField: '_id'
})

picQuizSchema.methods.toJSON = function() {
    const quiz = this;
    const quizObject = quiz.toObject();

    quizObject.bigQuestionImageURL = process.env.DOMAIN + "api/pic-quiz/" + quiz.quizId + "/image";
    quizObject.smallQuestions.forEach(question => {
        if (question.question.questionImage) 
            question.question.questionImageURL = process.env.DOMAIN + "api/question/" + question.question.questionType + "/" + question.question._id;
        delete question.question.questionImage;
    })

    delete quizObject.bigQuestionImage;

    return quizObject;
}

const PicQuiz = mongoose.model('PicQuiz', picQuizSchema);

module.exports = PicQuiz;