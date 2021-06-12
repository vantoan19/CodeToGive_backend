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

        if (req.file.buffer)
            req.body.studentWork = await logic.imageBufferProcess(req.file.buffer, 1000);

        const studentWork = await logic.createDocument(ScribblyStudentWork, {
            ...req.body,
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
        
        needToDoListObj = needToDoList.map(quiz => quiz.toJSON());
        needToDoListObj.forEach(quiz => {
            quiz.status = 'to-do';
        })

        res.send({ message: 'Get succesfully', quizzes: needToDoListObj });
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

        finishedObj = finished.map(quiz => quiz.toObject());
        
        finishedObj.forEach(quiz => {
            quiz.status = 'finished';
            quiz.studentWorks.forEach(work => {
                work.isHahaVoted = work.hahaReact.some(id => JSON.stringify(id) === JSON.stringify(req.user._id));
                work.isWowVoted = work.wowReact.some(id => JSON.stringify(id) === JSON.stringify(req.user._id));
                work.isLoveVoted = work.loveReact.some(id => JSON.stringify(id) === JSON.stringify(req.user._id));
 

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
            quiz.myWork = quiz.studentWorks.find(work => work.author.some(auth => auth.account === req.user.account));
            quiz.classmateWork = quiz.studentWorks.filter(work => !work.author.some(auth => auth.account === req.user.account));
            delete quiz.studentWorks;
        })

        res.send({ message: 'Get succesfully', quizzes: finishedObj });
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
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