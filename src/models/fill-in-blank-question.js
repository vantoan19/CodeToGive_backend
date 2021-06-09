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

fillInBlankQuestionSchema.methods.toJSON = function() {
    question = this

    questionObject = question.toObject();
    if (questionObject.questionImage) {
        questionObject.questiionImageURL = process.env.DOMAIN + "/api/question/" + questionObject._id;
    }
    delete questionObject.questionImage;

    return questionObject;
}

const FillInBlankQuestion = mongoose.model('FillInBlankQuestion', fillInBlankQuestionSchema);

module.exports = FillInBlankQuestion;