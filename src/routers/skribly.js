const express = require('express');
const sharp = require('sharp');
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/is-admin');
const SkriblyQuiz = require('../models/skribly');
const SkriblyStudentWork = require('../models/skiribly-studentwork');
const logic = require('./logic/logic');
const upload = require('../middleware/upload');

const router = express.Router();

// @POST /api/skribly/create
// @Desc Create a skribly quiz
router.post('/api/skribly/create', authenticate, isAdmin, upload.none(), async (req, res) => {
    console.log(req.body);
    try {
        const quiz = await logic.createQuiz(SkriblyQuiz, req.body);

        res.send({ message: 'Created succesfully', quiz });
    } catch (error) {
        res.status(400).send(error);
    }
});


// @POST /api/skribly/submit/:quizId/
// @Desc Submit a skribly work
router.post('/api/skribly/submit/:quizId', authenticate, upload.single('studentWork'), async (req, res) => {
    try {
        const quiz = await SkriblyQuiz.findOne({ quizId: req.params.quizId });
        if (!quiz)
            return res.status(404).send({ error: 'Quiz not found' });

        const studentWork = await logic.createDocument(SkriblyStudentWork, {
            ...req.body,
            studentWork: await logic.imageBufferProcess(req.file.buffer, 1000),
            author: [ req.user ]
        });

        quiz.studentWorks.push(studentWork);
        req.user.takenQuizzes.push({
            quiz,
            quizType: 'Skribly'
        });
        await req.user.save();
        await quiz.save();

        res.send({ message: 'Submit succesfully' });
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
});

// @POST /api/skribly/react/:reactType/:workId
// @Desc React a work
router.post('/api/skribly/react/:reactType/:workId', authenticate, async (req, res) => {
    try {
        const work = await SkriblyStudentWork.findOne({ _id: req.params.workId });
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

// @GET /api/skribly/need-to-do
// @Desc Get need to do
router.get('/api/skribly/need-to-do', authenticate, async (req, res) => {
    try {
        await req.user.populate('takenQuizzes.quiz').execPopulate();
        const takenQuizzes = req.user.takenQuizzes.map(quiz => quiz.quiz._id);
        const allUserQuizzes = await Promise.all(logic.getUserQuizzes(req.user));
        const allSkribleQuizzes = allUserQuizzes.flat().filter(quiz => quiz.quizType === 'Skribly');

        const needToDoList = allSkribleQuizzes.filter(quiz => !takenQuizzes.includes(quiz.quiz._id))
                                              .map(quiz => quiz.quiz);
        
        res.send({ message: 'Get succesfully', quizzes: needToDoList });
    } catch (error) {
        req.status(400).send(error);
    }
});

// @GET /api/skribly/finished
// @Desc Get finished
router.get('/api/skribly/finished', authenticate, async (req, res) => {
    try {
        await req.user.populate('takenQuizzes.quiz').execPopulate();
        const takenQuizzes = req.user.takenQuizzes.map(quiz => quiz.quiz._id);
        const allUserQuizzes = await Promise.all(logic.getUserQuizzes(req.user));
        const allSkribleQuizzes = allUserQuizzes.flat().filter(quiz => quiz.quizType === 'Skribly');

        const finished = allSkribleQuizzes.filter(quiz => takenQuizzes.includes(quiz.quiz._id))
                                              .map(quiz => quiz.quiz);
        await SkriblyQuiz.populate(finished, { 
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

// @GET /api/skribly/:quizId
// @Desc Get skribly quiz
router.get('/api/skribly/:id', async (req, res) => {
    const quizId = req.params.id;

    try {
        const quiz = await SkriblyQuiz.findOne({ quizId });

        if (!quiz)
            return res.status(404).send({ error: 'Not found' });

        res.send({ message: 'Get data successfully', quiz });
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});

router.get('/api/skribly-work/img/:workId', async (req, res) => {
    try {
        const work = await SkriblyStudentWork.findOne({ _id: req.params.workId });

        if (!work) 
            return res.status(404).send({ error: 'Not found' });

        res.set('Content-Type', 'image/png');
        res.send(work.studentWork);
    } catch (error) {
        res.status(400).send(error);
    }
});


module.exports = router;