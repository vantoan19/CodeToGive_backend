const express = require('express');
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/is-admin');
const ScribblyQuiz = require('../models/scribbly');
const ScribblyStudentWork = require('../models/scribbly-studentwork');
const logic = require('./logic/logic');
const scribblyLogic = require('./logic/scribbly-logic');
const upload = require('../middleware/upload');
const Class = require('../models/class');

const router = express.Router();

// @POST /api/scribbly/create
// @Desc Create a scribbly quiz
router.post('/api/scribbly/create', authenticate, isAdmin, upload.none(), async (req, res) => {
    try {
        const quiz = await logic.createQuiz(ScribblyQuiz, req.body);

        //Create blank works for each group
        if (req.body.scribblyType === 'group') {
            const classDoc = await Class.findOne({ 
                classId: req.body.class 
            });
            if (!classDoc) 
                return res.status(404).send({ 
                    error: 'Class not found' 
                });

            const groupSize = req.body.groupSize || classDoc.studentList.length;
            const groups = logic.getRandomGroups(classDoc.studentList, groupSize);
            console.log(groups);
            for (let i = 0; i < groups.length; ++i) {
                const workDoc = await logic.createDocument(ScribblyStudentWork, {
                    author: groups[i]
                });
                await logic.injectStudentworkToQuiz(workDoc, quiz);
            }
        }

        res.send({ 
            message: 'Created succesfully', 
            quiz 
        });
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
});


// @POST /api/scribbly/submit/:quizId/
// @Desc Submit a scribbly work
router.post('/api/scribbly/submit/:quizId', authenticate, upload.single('studentWork'), async (req, res) => {
    try {
        const quiz = await ScribblyQuiz.findOne({ quizId: req.params.quizId })
                                       .populate('studentWorks');
        if (!quiz)
            return res.status(404).send({ 
                error: 'Quiz not found' 
            });

        if (req.file)
            req.body.studentWork = await logic.imageBufferProcess(req.file.buffer, 1000);

        if (quiz.scribblyType === 'individual') {
            const studentWork = await logic.createDocument(ScribblyStudentWork, {
                ...req.body,
                author: [ req.user ]
            });
            await logic.injectStudentworkToQuiz(studentWork, quiz);
        } else { //Group
            const workDoc = scribblyLogic.findGroupStudentWorkByUserId(quiz.studentWorks, req.user._id);
            await logic.updateDocument(workDoc, {
                ...req.body,
                curTaskDesc: workDoc.curTaskDesc + 1
            });
        }
        // Mark as finished
        await logic.injectQuizToUser(quiz, req.user);

        res.send({ 
            message: 'Submit succesfully' 
        });
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
});

// @POST /api/scribbly/react/:reactType/:workId
// @Desc React a work
router.post('/api/scribbly/react/:reactType/:workId', authenticate, async (req, res) => {
    try {
        const work = await ScribblyStudentWork.findOne({ 
            _id: req.params.workId 
        });
        if (!work)
            return req.status(404).send({ 
                error: 'Not found' 
            });

            console.log(work[req.params.reactType])
        if (work[req.params.reactType].includes(req.user._id)) 
            work[req.params.reactType] = work[req.params.reactType].filter(curUser => {
                return JSON.stringify(curUser) !== JSON.stringify(req.user._id);
            })
        else //Add user to react list
            work[req.params.reactType].push(req.user);
        console.log(work[req.params.reactType])

        await work.save();
        
        res.send({ 
            message: 'Reacted successfully' 
        });
    } catch (error) {
        res.status(400).send(error);
    }
});

// @GET /api/scribbly/need-to-do
// @Desc Get need to do
router.get('/api/scribbly/need-to-do', authenticate, async (req, res) => {
    try {
        await req.user.populate('takenQuizzes.quiz')
                      .execPopulate();
        const takenQuizzesId = req.user.takenQuizzes
                                       .map(quiz => quiz.quiz._id);
        const allUserQuizzes = await Promise.all(await logic.getUserQuizzes(req.user));
        const allSkribleQuizzes = allUserQuizzes.flat()
                                                .filter(quiz => quiz.quizType === 'Scribbly');
        const needToDoList = allSkribleQuizzes.filter(quiz => !takenQuizzesId.includes(quiz.quiz._id))
                                              .map(quiz => quiz.quiz);
        
        await ScribblyQuiz.populate(needToDoList, { 
            path: 'studentWorks'
        });
        const needToDoListObj = scribblyLogic.buildReturnedObjectNeedToDo(needToDoList, req.user);

        res.send({ 
            message: 'Get succesfully', 
            quizzes: needToDoListObj 
        });
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

        let finished = allSkribleQuizzes.filter(quiz => takenQuizzes.includes(quiz.quiz._id))
                                              .map(quiz => quiz.quiz);
        
        await ScribblyQuiz.populate(finished, { 
            path: 'studentWorks',
            populate: { 
                path: 'author',
                select: 'account firstName lastName'
            }
        });

        finished = finished.filter(quiz => {
            if (quiz.scribblyType === 'group') {
                const myWork = scribblyLogic.findGroupStudentWorkByUserAccount(quiz.studentWorks, req.user);
                if (!myWork) return false;
                return myWork.curTaskDesc >= myWork.author.length;
            }
            return true;
        });

        console.log(finished);

        const finishedObj = scribblyLogic.buildReturnedObjectFinished(finished, req.user);

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
        const quiz = await ScribblyQuiz.findOne({ 
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

// @GET /api/scribbly-work/img/:workId
// @Desc Get work's image
router.get('/api/scribbly-work/img/:workId', async (req, res) => {
    try {
        const work = await ScribblyStudentWork.findOne({ 
            _id: req.params.workId 
        });

        if (!work) 
            return res.status(404).send({ 
                error: 'Not found' 
            });

        res.set('Content-Type', 'image/png');
        res.send(work.studentWork);
    } catch (error) {
        res.status(400).send(error);
    }
});

// @PATCH /api/scribbly/:quizId
// @Desc Modify quiz by id
router.patch('/api/scribbly/:quizId', authenticate, isAdmin, upload.none(), async (req, res) => {
    if (Object.keys(req.body).includes('quizId')) 
        return res.status(400).send({ 
            error: 'Invalid update!' 
        });

    try {
        const quiz = await ScribblyQuiz.findOne({ 
            quizId: req.params.quizId 
        });

        if (!quiz)
            return res.status(404).send({ 
                error: 'Not found' 
            });
        await logic.updateDocument(quiz, req.body);

        res.send({ 
            message: 'Updated successfully' 
        });
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
});


module.exports = router;