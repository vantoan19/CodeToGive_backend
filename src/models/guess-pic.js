const mongoose = require('mongoose');
const validator = require('validator');

const guessPicQuizSchema = new mongoose.Schema({
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
    createdDate: Date,
    maxPoint: Number,
    numberOfAttempt: Number,
    maxTime: Number,
    class: {
        type: String,
        required: true
    },
    bigQuestion: {
        type: String,
        required: true
    },
    bigAnswer: {
        type: String,
        required: true
    },
    guessImage: {
        type: Buffer,
        required: true
    },
    miniQuestions: [{
        question: String,
        questionType: String,
        answer: String,
        options: [String]
    }],
    participants: [{
        account: String,
        score: Number,
        takenDate: Date,
        duration: Number
    }]
});

guessPicQuizSchema.methods.toJSON = function() {
    const quiz = this;
    const quizObject = quiz.toObject();

    quizObject.guessPicURL = process.env.DOMAIN + "guesspic/" + quiz.quizId + "/image";
    delete quizObject.guessImage;

    return quizObject;
}

const GuessPicQuiz = mongoose.model('GuessPickQuiz', guessPicQuizSchema);

module.exports = GuessPicQuiz;