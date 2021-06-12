const mongoose = require('mongoose');

const PicQuizzSchema = new mongoose.Schema({
    quizType: {
        type: String,
        default: 'PicQuizz'
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
        info: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'smallQuestions.questionType'
        },
        questionType: {
            type: String,
            required: true,
            enum: ['MultipleChoiceQuestion', 'FillInBlankQuestion']
        }
    }],
    studentWorks: [{
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        score: Number,
        takenDate: Date,
        duration: Number
    }]
});



PicQuizzSchema.methods.toJSON = function() {
    const quiz = this;
    const quizObject = quiz.toObject();
    
    quizObject.bigQuestionImageURL = `${process.env.DOMAIN}api/pic-quiz/${quiz.quizId}/image`;;
    quizObject.smallQuestions.forEach(question => {
        if (question.info.questionImage) 
            question.info.questionImageURL = `${process.env.DOMAIN}api/question/${question.info.questionType}/${question.info._id}`;
        question.info.updateQuestionAPI_URL = `${process.env.DOMAIN}api/pic-quiz/${quiz.quizId}/${question.info.questionType}/${question.info._id}`;
        delete question.info.questionImage;
    })

    delete quizObject.bigQuestionImage;

    return quizObject;
}

const PicQuizz = mongoose.model('PicQuizz', PicQuizzSchema);

module.exports = PicQuizz;