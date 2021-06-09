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

multipleChoiceQuestionSchema.methods.toJSON = function() {
    question = this

    questionObject = question.toObject();
    if (questionObject.questionImage) {
        questionObject.questiionImageURL = process.env.DOMAIN + "/api/question/" + questionObject._id;
    }
    delete questionObject.questionImage;

    return questionObject;
}

const MultipleChoiceQuestion = mongoose.model('MultipleChoiceQuestion', multipleChoiceQuestionSchema);

module.exports = MultipleChoiceQuestion;