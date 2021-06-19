const mongoose = require('mongoose');


const quizSchema = new mongoose.Schema({
    quizType: {
        type: String,
        default: 'Quiz'
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
    class: String,
    questions: [{
        info: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'questions.questionType'
        },
        questionType: {
            type: String,
            required: true,
            enum: ['MultipleChoiceQuestion', 'FillInBlankQuestion']
        }
    }],
    studentWorks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuizStudentWork'
    }]
});


quizSchema.methods.toJSON = function() {
    const quiz = this;
    const quizObject = quiz.toObject();
    
    quizObject.questions.forEach(question => {
        if (question.info.questionImage)
            question.info.questionImageURL = `${process.env.DOMAIN}api/question/${question.info.questionType}/${question.info._id}`;
        question.info.updateQuestionAPI_URL = `${process.env.DOMAIN}api/quiz/${quiz.quizId}/${question.info.questionType}/${question.info._id}`;
        delete question.info.questionImage;
    });

    return quizObject;
}

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;