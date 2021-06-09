const mongoose = require('mongoose');


const questionSchema = new mongoose.Schema({
    question: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'questionType'
    },
    questionType: {
        type: String,
        required: true,
        enum: ['MultipleChoiceQuestion', 'FillInBlankQuestion']
    }
});

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;
