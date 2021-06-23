const express = require('express');
const authenticate = require('../middleware/authenticate');
const upload = require('../middleware/upload');
const isAdmin = require('../middleware/is-admin');
const Quiz = require('../models/quiz');
const QuizStudentWork = require('../models/quiz-studentwork');
const Class = require('../models/class');
const User = require('../models/user');
const logic = require('./logic/logic');

const router = new express.Router();

// @POST /api/quiz/create
// @Desc Create a quiz
router.post('/api/quiz/create', authenticate, isAdmin, upload.none(), async (req, res) => {
    try {
        const quiz = await logic.createQuiz(Quiz, req.body);

        res.status(201).send({ 
            message: 'Created succesfully', 
            quiz 
        });
    } catch (error) {
        console.log(error);
    }
}, (error, req, res, next) => {
    res.status(400).send(error);
});

// @POST /api/quiz/:id/new-question
// @Desc Create a new question for the quiz
router.post('/api/quiz/:id/new-question', authenticate, isAdmin, upload.single('questionImage'), async (req, res) => {
    //Appropriate question document to question type
    let concreteQuestion = logic.getDocumentByType(req.body.questionType, req.body);

    try {
        if (req.file)
            concreteQuestion.questionImage = await logic.imageBufferProcess(req.file.buffer, 1000);
        await concreteQuestion.save();

        //Link question to current quiz
        const quizId = req.params.id;
        const quiz = await Quiz.findOne({ quizId });
        if (!quiz) {
            await concreteQuestion.remove();
            return res.status(404).send({ 
                error: 'Class not found' 
            });
        }

        quiz.questions.push({ 
            info: concreteQuestion, 
            questionType: logic.getModelNameByType(req.body.questionType) 
        });

        await quiz.save();

        res.status(201).send({ 
            message: 'Created successfully' 
        });
    } catch (error) {
        res.status(400).send(error);
    }
});

// @POST /api/quiz/submit/:quizId
// @Desc Submit quiz
router.post('/api/quiz/submit/:quizId', authenticate, upload.none(), async (req, res) => {
    try {
        const quiz = await Quiz.findOne({ 
            quizId: req.params.quizId 
        });

        if (!quiz)
            return res.status(404).send({ 
                error: 'Not found' 
            });

        await quiz.populate({
            path: 'studentWorks',
            populate: {
                path: 'author',
                select: 'account'
            }
        }).execPopulate();

        const curTry = quiz.studentWorks
                           .filter(work => work.author.account === req.user.account).length + 1;
        if (curTry > quiz.numberOfAttempt)
            return res.status(400).send({
                message: 'Out of attempt'
            });

        const work = await logic.createDocument(QuizStudentWork, {
            ...req.body,
            author: req.user,
            tryCount: curTry
        });
        req.user.stars = parseInt(req.user.stars) + parseInt(req.body.score) / 20;

        await logic.injectStudentworkToQuiz(work, quiz);
        await logic.injectQuizToUser(quiz, req.user);

        res.send({ 
            message: 'Submit succesfully' 
        });
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
});

//===================================================================================
//===================================================================================

// @GET /api/quiz/get-list/:type
// @Desc Get need to do
router.get('/api/quiz/get-list/:type', authenticate , async (req, res) => {
    try {
        await req.user.populate('takenQuizzes.quiz')
                      .execPopulate();
        const takenQuizzes = req.user.takenQuizzes.map(quiz => quiz.quiz._id);

        const allUserQuizzes = await Promise.all(await logic.getUserQuizzes(req.user));
        const allQuizzes = allUserQuizzes.flat()
                                            .filter(quiz => quiz.quizType === 'Quiz');

        if (req.params.type === 'need-to-do') {
            const needToDoList = allQuizzes.filter(quiz => !takenQuizzes.includes(quiz.quiz._id))
                                              .map(quiz => quiz.quiz);
            await Quiz.populate(needToDoList, { 
                path: 'questions.info'
            });

            needToDoObj = needToDoList.map(quiz => quiz.toJSON());
            needToDoObj.forEach(quiz => {
                quiz.status = 'to-do';
            });

            res.send({ 
                message: 'Get succesfully', 
                quizzes: needToDoObj 
            });
        } else { //finished
            const finished = allQuizzes.filter(quiz => takenQuizzes.includes(quiz.quiz._id))
                                              .map(quiz => quiz.quiz);
            await Quiz.populate(finished, { 
                path: 'questions.info'
            });

            finishedObj = finished.map(quiz => quiz.toJSON());
            finishedObj.forEach(quiz => {
                quiz.status = 'finished';
            });

            res.send({ 
                message: 'Get succesfully', 
                quizzes: finishedObj 
            });
        }
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
});


// @GET /api/quiz/:id
// @Desc Get quiz information by id
router.get('/api/quiz/:id', async (req, res) => {
    const quizId = req.params.id;

    try {
        const quiz = await Quiz.findOne({ quizId })
                               .populate('questions.info');

        if (!quiz)
            return res.status(404).send({ 
                error: 'Not found' 
            });

        res.send({ 
            message: 'Get data successfully', 
            quiz 
        });
    } catch (error) {
        res.status(500).send(error);
    }
});


//===================================================================================
//===================================================================================

// @PATCH /api/quiz/:id
// @Desc Modify quiz by id
router.patch('/api/quiz/:id', authenticate, isAdmin, async (req, res) => {
    if (Object.keys(req.body).includes('quizId')) 
        return res.status(400).send({ 
            error: 'Invalid update!' 
        });

    try {
        const quiz = await Quiz.findOne({ 
            quizId: req.params.id 
        });
        if (!quiz)
            res.status(404).send('Not found');

        await logic.updateDocument(quiz, req.body);

        res.send({ 
            message: 'Updated successfully' 
        });
    } catch (error) {
        res.status(400).send(error);
    }
});

// @PATCH /api/pic-quiz/:id/:questionType/:questionId
// @Desc Modify a question of a task by question's id 
router.patch('/api/quiz/:quizId/:questionType/:questionId', authenticate, isAdmin, upload.single('questionImage'), async (req, res) => {
    try {
        //Find quiz and question document
        const quiz = await Quiz.findOne({ 
            quizId: req.params.quizId 
        });
        const question = await logic.findQuestionByType(req.params.questionType, { 
            _id: req.params.questionId 
        });
        
        //Check if quiz or question doesn't exist or question doesn't belong to the quiz
        if (!quiz || !question)
            return res.status(404).send({ 
                error: 'Quiz or question doesn\'t exist' 
            });
        
        if (!quiz.questions.some(curQuestion => 
                                curQuestion.info.str == question._id.str ))
            return res.status(400).send({ 
                error: 'The question doesn\'t belong to the quiz' 
            });

        //Updating stuff
        if (req.file)
            req.body.questionImage = await logic.imageBufferProcess(req.file.buffer, 1000);
        await logic.updateDocument(question, req.body);

        res.send({ message: 'Updated succesfully '});
    } catch (error) {
        res.status(400).send(error);
    }
});

//===================================================================================
//===================================================================================

// @DELETE /api/quiz/:id
// @Desc Delete a quiz
router.delete('/api/quiz/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const quiz = await Quiz.findOneAndDelete({ 
            quizId: req.params.id 
        });

        if (!quiz) 
            return res.status(404).send();

        //Delete small question
        quiz.questions
            .forEach(async question => 
                await logic.deleteQuestionByType(question.questionType, { 
                    _id: question.info._id 
                }));

        //Delete quiz from the class
        quiz.class.forEach(async classId => {
            const classDoc = await Class.findOne({ classId });
            classDoc && await logic.updateDocument(classDoc, {
                quizList: classDoc.quizList.filter(curQuiz => curQuiz.quiz.str !== quiz._id.str)
            });
        });

        res.send({ 
            message: 'Deleted succesfully' 
        });
    } catch (error) {
        res.status(500).send(error);
    }
});




module.exports = router;
    