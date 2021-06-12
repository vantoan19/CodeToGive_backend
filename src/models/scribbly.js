const mongoose = require('mongoose');

const ScribblySchema = new mongoose.Schema({
    quizType: {
        type: String,
        default: 'Scribbly'
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
    scribblyType: {
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
    taksDescription: [String],
    studentWorks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ScribblyStudentWork'
    }]
});

ScribblySchema.methods.toJSON = function() {
    const quiz = this;
    const quizObject = quiz.toObject();
    
    quizObject.studentWorks.forEach(work => {
        if (work.studentWork)
            work.studentWorkURL = `${process.env.DOMAIN}api/scribbly-work/img/${work._id}`;
        delete work.studentWork;
        work.loveReact = work.loveReact.length;
        work.hahaReact = work.hahaReact.length;
        work.wowReact = work.wowReact.length;

        work.loveReactAPI_URL = `${process.env.DOMAIN}api/scribbly/react/loveReact/${work._id}`;
        work.wowReactAPI_URL = `${process.env.DOMAIN}api/scribbly/react/wowReact/${work._id}`;
        work.hahaReactAPI_URL = `${process.env.DOMAIN}api/scribbly/react/hahaReact/${work._id}`;
    });

    return quizObject;
}

const ScribblyQuiz = mongoose.model('Scribbly', ScribblySchema);

module.exports = ScribblyQuiz;