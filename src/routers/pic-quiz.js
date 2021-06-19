const express = require('express');
const authenticate = require('../middleware/authenticate');
const upload = require('../middleware/upload');
const isAdmin = require('../middleware/is-admin');
const PicQuizz = require('../models/pic-quiz');
const PicQuizzStudentWork = require('../models/pic-quiz-studentwork');
const Class = require('../models/class');
const User = require('../models/user');
const logic = require('./logic/logic');
const picQuizLogic = require('./logic/pic-quiz-logic');

const router = new express.Router();

    

// @POST /api/pic-quiz/create
// @Desc Create a pic quiz
router.post('/api/pic-quiz/create', authenticate, isAdmin, upload.single('bigQuestionImage'), async (req, res) => {
    try {
        const quiz = await logic.createQuiz(PicQuizz, {
            ...req.body,
            bigQuestionImage: await logic.imageBufferProcess(req.file.buffer, 1000)
        });

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

// @POST /api/pic-quiz/:id/new-question
// @Desc Create a new question for a quiz
router.post('/api/pic-quiz/:id/new-question', authenticate, isAdmin, upload.single('questionImage'), async (req, res) => {
    //Appropriate question document to question type
    let concreteQuestion = picQuizLogic.getDocumentByType(req.body.questionType, req.body);

    try {
        if (req.file)
            concreteQuestion.questionImage = await logic.imageBufferProcess(req.file.buffer, 1000);
        await concreteQuestion.save();

        //Link question to current quiz
        const quizId = req.params.id;
        const quiz = await PicQuizz.findOne({ quizId });
        if (!quiz) {
            await concreteQuestion.remove();
            return res.status(404).send({ error: 'Class not found' });
        }

        quiz.smallQuestions.push({ 
            info: concreteQuestion, 
            questionType: picQuizLogic.getModelNameByType(req.body.questionType) 
        });
        await quiz.save();

        res.status(201).send({ 
            message: 'Created successfully' 
        });
    } catch (error) {
        res.status(400).send(error);
    }
});

// @POST /api/pic-quiz/submit/:quizId
// @Desc Submit pic quiz
router.post('/api/pic-quiz/submit/:quizId', authenticate, upload.none(), async (req, res) => {
    try {
        const quiz = await PicQuizz.findOne({ quizId: req.params.quizId });
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

        const work = await logic.createDocument(PicQuizzStudentWork, {
            ...req.body,
            author: req.user,
            tryCount: curTry
        });

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

// @GET /api/pic-quiz/get-list/:type
// @Desc Get need to do
router.get('/api/pic-quiz/get-list/:type', authenticate , async (req, res) => {
    try {
        await req.user.populate('takenQuizzes.quiz')
                      .execPopulate();
        const takenQuizzes = req.user.takenQuizzes.map(quiz => quiz.quiz._id);

        const allUserQuizzes = await Promise.all(await logic.getUserQuizzes(req.user));
        const allPicQuizzes = allUserQuizzes.flat()
                                            .filter(quiz => quiz.quizType === 'PicQuizz');

        if (req.params.type === 'need-to-do') {
            const needToDoList = allPicQuizzes.filter(quiz => !takenQuizzes.includes(quiz.quiz._id))
                                              .map(quiz => quiz.quiz);
            await PicQuizz.populate(needToDoList, { 
                path: 'smallQuestions.info'
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
            const finished = allPicQuizzes.filter(quiz => takenQuizzes.includes(quiz.quiz._id))
                                              .map(quiz => quiz.quiz);
            await PicQuizz.populate(finished, { 
                path: 'smallQuestions.info'
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
        res.status(400).send(error);
    }
});


// @GET /api/pic-quiz/:id
// @Desc Get quiz information by id
router.get('/api/pic-quiz/:id', async (req, res) => {
    const quizId = req.params.id;

    try {
        const quiz = await picQuizLogic.findOneAndPopulateQuiz({ 
            quizId 
        });

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

// @GET /api/pic-quiz/:id/image
// @Desc Get the image of the quiz
router.get('/api/pic-quiz/:id/image', async (req, res) => {
    const quizId = req.params.id;

    try {
        const quiz = await PicQuizz.findOne({ 
            quizId 
        });

        if (!quiz || !quiz.bigQuestionImage)
            throw new Error('Not found');

        res.set('Content-Type', 'image/png');
        res.send(quiz.bigQuestionImage);
    } catch (error) {
        res.status(404).send(error);
    }
})

// @GET /api/question/:questionType/:id
// @Desc Get the image of the question
router.get('/api/question/:questionType/:id', async (req, res) => {
    const questionId = req.params.id;
    const questionType = req.params.questionType;

    try {
        let question = await picQuizLogic.findQuestionByType(questionType, { 
            _id: questionId 
        });

        if (!question || !question.questionImage)
            throw new Error('Not found');

        res.set('Content-Type', 'image/png');
        res.send(question.questionImage);
    } catch (error) {
        res.status(404).send(error);
    }
});


//===================================================================================
//===================================================================================

// @PATCH /api/pic-quiz/:id
// @Desc Modify quiz by id
router.patch('/api/pic-quiz/:id', authenticate, isAdmin, upload.single('bigQuestionImage'), async (req, res) => {
    if (Object.keys(req.body).includes('quizId')) 
        return res.status(400).send({ 
            error: 'Invalid update!' 
        });

    try {
        const quiz = await PicQuizz.findOne({ 
            quizId: req.params.id 
        });
        if (!quiz)
            res.status(404).send('Not found');

        if (req.file) 
            req.body.bigQuestionImage = await logic.imageBufferProcess(req.file.buffer, 1000);
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
router.patch('/api/pic-quiz/:quizId/:questionType/:questionId', authenticate, isAdmin, upload.single('questionImage'), async (req, res) => {
    try {
        //Find quiz and question document
        const quiz = await PicQuizz.findOne({ 
            quizId: req.params.quizId 
        });
        const question = await picQuizLogic.findQuestionByType(req.params.questionType, { 
            _id: req.params.questionId 
        });
        
        //Check if quiz or question doesn't exist or question doesn't belong to the quiz
        if (!quiz || !question)
            return res.status(404).send({ 
                error: 'Quiz or question doesn\'t exist' 
            });
        
        if (!quiz.smallQuestions.some(smallQuestion => 
                                      smallQuestion.info.str == question._id.str ))
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

// @DELETE /api/pic-quiz/:id
// @Desc Delete a quiz
router.delete('/api/pic-quiz/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const quiz = await PicQuizz.findOneAndDelete({ 
            quizId: req.params.id 
        });

        if (!quiz) 
            return res.status(404).send();

        //Delete small question
        quiz.smallQuestions
            .forEach(async smallQuestion => 
                await picQuizLogic.deleteQuestionByType(smallQuestion.questionType, { 
                    _id: smallQuestion.info._id 
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