const mongoose = require('mongoose');
const validator = require('validator');

const miniQuestionScheme = new mongoose.Schema({
    miniQuestion: {
        type: String,
        required: true
    },
    questionType: {
        type: String,
        required: true
    },
    questionDesc: {
        description: String,
        descriptionImage: String
    },
    miniAnswer: {
        textAnswer: String,
        optionAnswer: String
    },
    options: [String]
});

const participantScheme = new mongoose.Schema({
    account: {
        type: String,
        required: true
    },
    result: Number,
    duration: Number,
    takeAt: Date
});

const guessPicTaskSchema = new mongoose.Schema({
    taskType: {
        type: String,
        default: 'Guess Pic Game'
    },
    taskId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
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
        type: String,
        required: true
    },
    miniQuestions: [miniQuestionScheme],
    participants: {
        type: [participantScheme],
        default: []
    }
});

const GuessPicTask = mongoose.model('GuessPickTask', guessPicTaskSchema);

module.exports = GuessPicTask;