const mongoose = require('mongoose');

const skriblySchema = new mongoose.Schema({
    quizType: {
        type: String,
        default: 'Skribly'
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
    skribleType: {
        type: String,
        default: 'individual'
    },
    author: String,
    createdDate: Date,
    maxPoint: Number,
    numberOfAttempt: Number,
    maxTime: Number,
    dueDate: Date,
    classes: [String],
    taksDescription: String,
    studentWorks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SkriblyStudentWork'
    }]
});

skriblySchema.methods.toJSON = function() {
    const quiz = this;
    const quizObject = quiz.toObject();
    
    quizObject.studentWorks.forEach(work => {
        if (work.studentWork)
            work.studentWorkURL = `${process.env.DOMAIN}api/skribly-work/img/${work._id}`;
        delete work.studentWork;
        work.loveReact = work.loveReact.length;
        work.hahaReact = work.hahaReact.length;
        work.wowReact = work.wowReact.length;

        work.loveReactAPI_URL = `${process.env.DOMAIN}api/skribly/react/loveReact/${work._id}`;
        work.wowReactAPI_URL = `${process.env.DOMAIN}api/skribly/react/wowReact/${work._id}`;
        work.hahaReactAPI_URL = `${process.env.DOMAIN}api/skribly/react/hahaReact/${work._id}`;
    });

    return quizObject;
}

const SkriblyQuiz = mongoose.model('Skribly', skriblySchema);

module.exports = SkriblyQuiz;