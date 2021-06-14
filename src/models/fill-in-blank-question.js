const mongoose = require('mongoose');


const fillInBlankQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        require: true
    },
    questionType: {
        type: String,
        default: 'fill-in-blank'
    },
    answer: {
        type: String,
        required: true
    },
    questionDesc: String,
    questionImage: Buffer
});


const FillInBlankQuestion = mongoose.model('FillInBlankQuestion', fillInBlankQuestionSchema);

module.exports = FillInBlankQuestion;