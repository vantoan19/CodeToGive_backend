const express = require('express');
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/is-admin');
const ScribblyQuiz = require('../models/scribbly');
const ScribblyStudentWork = require('../models/scribbly-studentwork');
const logic = require('./logic/logic');
const upload = require('../middleware/upload');

const router = express.Router();

// @POST /api/scribbly/create
// @Desc Create a scribbly quiz
router.post('/api/scribbly/create', authenticate, isAdmin, upload.none(), async (req, res) => {
    console.log(req.body);
    try {
        const quiz = await logic.createQuiz(ScribblyQuiz, req.body);

        res.send({ message: 'Created succesfully', quiz });
    } catch (error) {
        res.status(400).send(error);
    }
});


// @POST /api/scribbly/submit/:quizId/
// @Desc Submit a scribbly work
router.post('/api/scribbly/submit/:quizId', authenticate, upload.single('studentWork'), async (req, res) => {
    try {
        const quiz = await ScribblyQuiz.findOne({ quizId: req.params.quizId });
        if (!quiz)
            return res.status(404).send({ error: 'Quiz not found' });

        const studentWork = await logic.createDocument(ScribblyStudentWork, {
            ...req.body,
            studentWork: await logic.imageBufferProcess(req.file.buffer, 1000),
            author: [ req.user ]
        });

        quiz.studentWorks.push(studentWork);
        req.user.takenQuizzes.push({
            quiz,
            quizType: 'Scribbly'
        });
        await req.user.save();
        await quiz.save();

        res.send({ message: 'Submit succesfully' });
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
});

// @POST /api/scribbly/react/:reactType/:workId
// @Desc React a work
router.post('/api/scribbly/react/:reactType/:workId', authenticate, async (req, res) => {
    try {
        const work = await ScribblyStudentWork.findOne({ _id: req.params.workId });
        if (!work)
            req.status(404).send({ error: 'Not found' });

        if (work[req.params.reactType].includes(req.user._id)) {
            work[req.params.reactType] = work[req.params.reactType].filter(curUser => curUser.str !== req.user._id.str);
        }
        else
            work[req.params.reactType].push(req.user);
        await work.save();
        
        res.send({ message: 'Reacted successfully' });
    } catch (error) {
        res.status(400).send(error);
    }
});

// @GET /api/scribbly/need-to-do
// @Desc Get need to do
router.get('/api/scribbly/need-to-do', authenticate, async (req, res) => {
    try {
        await req.user.populate('takenQuizzes.quiz').execPopulate();
        const takenQuizzes = req.user.takenQuizzes.map(quiz => quiz.quiz._id);
        const allUserQuizzes = await Promise.all(await logic.getUserQuizzes(req.user));
        const allSkribleQuizzes = allUserQuizzes.flat().filter(quiz => quiz.quizType === 'Scribbly');

        const needToDoList = allSkribleQuizzes.filter(quiz => !takenQuizzes.includes(quiz.quiz._id))
                                              .map(quiz => quiz.quiz);
        
        res.send({ message: 'Get succesfully', quizzes: needToDoList });
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
});

// @GET /api/scribbly/finished
// @Desc Get finished
router.get('/api/scribbly/finished', authenticate, async (req, res) => {
    try {
        await req.user.populate('takenQuizzes.quiz').execPopulate();
        const takenQuizzes = req.user.takenQuizzes.map(quiz => quiz.quiz._id);
        const allUserQuizzes = await Promise.all(await logic.getUserQuizzes(req.user));
        const allSkribleQuizzes = allUserQuizzes.flat().filter(quiz => quiz.quizType === 'Scribbly');

        const finished = allSkribleQuizzes.filter(quiz => takenQuizzes.includes(quiz.quiz._id))
                                              .map(quiz => quiz.quiz);
        await ScribblyQuiz.populate(finished, { 
            path: 'studentWorks',
            populate: { 
                path: 'author',
                select: 'account firstName lastName'
            }
        });
        res.send({ message: 'Get succesfully', quizzes: finished });
    } catch (error) {
        req.status(400).send(error);
    }
});

// @GET /api/scribbly/:quizId
// @Desc Get scribbly quiz
router.get('/api/scribbly/:id', async (req, res) => {
    const quizId = req.params.id;

    try {
        const quiz = await ScribblyQuiz.findOne({ quizId });

        if (!quiz)
            return res.status(404).send({ error: 'Not found' });

        res.send({ message: 'Get data successfully', quiz });
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});

router.get('/api/scribbly-work/img/:workId', async (req, res) => {
    try {
        const work = await ScribblyStudentWork.findOne({ _id: req.params.workId });

        if (!work) 
            return res.status(404).send({ error: 'Not found' });

        res.set('Content-Type', 'image/png');
        res.send(work.studentWork);
    } catch (error) {
        res.status(400).send(error);
    }
});


module.exports = router;