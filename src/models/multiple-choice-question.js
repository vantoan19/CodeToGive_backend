const mongoose = require('mongoose');

const multipleChoiceQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    questionType: {
        type: String,
        default: 'multiple-choice'
    },
    answer: {
        type: String,
        required: true
    },
    questionDesc: String,
    questionImage: Buffer,
    options: [String]
});


const MultipleChoiceQuestion = mongoose.model('MultipleChoiceQuestion', multipleChoiceQuestionSchema);

module.exports = MultipleChoiceQuestion;