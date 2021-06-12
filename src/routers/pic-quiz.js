const express = require('express');
const sharp = require('sharp');
const authenticate = require('../middleware/authenticate');
const upload = require('../middleware/upload');
const isAdmin = require('../middleware/is-admin');
const PicQuizz = require('../models/pic-quiz');
const FillInBlankQuestion = require('../models/fill-in-blank-question');
const MultipleChoiceQuestion = require('../models/multiple-choice-question');
const Class = require('../models/class');
const User = require('../models/user');
const logic = require('./logic/logic');

const router = new express.Router();

//Logic                                                        
const getDocumentByType = (questionType, obj) => 
    questionType === 'fill-in-blank' ? new FillInBlankQuestion(obj) : new MultipleChoiceQuestion(obj);

const getModelNameByType = (questionType) => 
    questionType === 'fill-in-blank' ? 'FillInBlankQuestion' : 'MultipleChoiceQuestion';

const findQuestionByType = async (questionType, indexes) =>
    questionType === 'fill-in-blank' 
                 ? await FillInBlankQuestion.findOne(indexes) 
                 : await MultipleChoiceQuestion.findOne(indexes);

const deleteQuestionByType = async (questionType, indexes) =>
    questionType === 'FillInBlankQuestion' 
                ? await FillInBlankQuestion.deleteOne(indexes) 
                : await MultipleChoiceQuestion.deleteOne(indexes);

const findOneAndPopulateQuiz = async (indexes) => await PicQuizz.findOne(indexes)
                                                               .populate('smallQuestions.info');

    

// @POST /api/pic-quiz/create
// @Desc Create a pic quiz
router.post('/api/pic-quiz/create', authenticate, isAdmin, upload.single('bigQuestionImage'), async (req, res) => {
    try {
        const quiz = await logic.createQuiz(PicQuizz, {
            ...req.body,
            bigQuestionImage: await logic.imageBufferProcess(req.file.buffer, 1000)
        });

        res.status(201).send({ message: 'Created succesfully', quiz });
    } catch (error) {
        res.status(400).send(error);
    }
});

// @POST /api/pic-quiz/:id/new-question
// @Desc Create a new question for a quiz
router.post('/api/pic-quiz/:id/new-question', authenticate, isAdmin, upload.single('questionImage'), async (req, res) => {
    //Appropriate question document to question type
    let concreteQuestion = getDocumentByType(req.body.questionType, req.body);

    try {
        concreteQuestion.questionImage = await logic.imageBufferProcess(req.file.buffer, 1000);
        await concreteQuestion.save();

        //Link question to current quiz
        const quizId = req.params.id;
        const quiz = await PicQuizz.findOne({ quizId });
        quiz.smallQuestions.push({ 
            info: concreteQuestion, 
            questionType: getModelNameByType(req.body.questionType) 
        });
        await quiz.save();

        res.status(201).send({ message: 'Created successfully' });
    } catch (error) {
        res.status(400).send(error);
    }
});



//===================================================================================
//===================================================================================

// @GET /api/pic-quiz/get-list/:type
// @Desc Get need to do
router.get('/api/pic-quiz/get-list/:type', authenticate , async (req, res) => {
    try {
        await req.user.populate('takenQuizzes.quiz').execPopulate();
        const takenQuizzes = req.user.takenQuizzes.map(quiz => quiz.quiz._id);

        const allUserQuizzes = await Promise.all(await logic.getUserQuizzes(req.user));

        const allPicQuizzes = allUserQuizzes.flat().filter(quiz => quiz.quizType === 'PicQuizz');
        if (req.params.type === 'need-to-do') {
            const needToDoList = allPicQuizzes.filter(quiz => !takenQuizzes.includes(quiz.quiz._id))
                                              .map(quiz => quiz.quiz);
            await PicQuizz.populate(needToDoList, { path: 'smallQuestions.info'});

            res.send({ message: 'Get succesfully', quizzes: needToDoList });
        } else {
            const finished = allPicQuizzes.filter(quiz => takenQuizzes.includes(quiz.quiz._id))
                                              .map(quiz => quiz.quiz);
            await PicQuizz.populate(finished, { path: 'smallQuestions.info'});

            res.send({ message: 'Get succesfully', quizzes: finished });
        }
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
});


// @GET /api/pic-quiz/:id
// @Desc Get quiz information by id
router.get('/api/pic-quiz/:id', async (req, res) => {
    const quizId = req.params.id;

    try {
        const quiz = await findOneAndPopulateQuiz({ quizId });

        if (!quiz)
            return res.status(404).send({ error: 'Not found' });

        res.send({ message: 'Get data successfully', quiz });
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
});

// @GET /api/pic-quiz/:id/image
// @Desc Get the image of the quiz
router.get('/api/pic-quiz/:id/image', async (req, res) => {
    const quizId = req.params.id;

    try {
        const quiz = await PicQuizz.findOne({ quizId });

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

    console.log(questionType, questionId);
    try {
        let question = await findQuestionByType(questionType, { _id: questionId });

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
        return res.status(400).send({ error: 'Invalid update!' });

    try {
        const quiz = await PicQuizz.findOne({ quizId: req.params.id });
        
        if (req.file) 
            req.body.bigQuestionImage = await logic.imageBufferProcess(req.file.buffer, 1000);
        await logic.updateDocument(quiz, req.body);

        res.send({ message: 'Updated successfully' });
    } catch (error) {
        res.status(400).send(error);
    }
});

// @PATCH /api/pic-quiz/:id/:questionType/:questionId
// @Desc Modify a question of a task by question's id 
router.patch('/api/pic-quiz/:quizId/:questionType/:questionId', authenticate, upload.single('questionImage'), async (req, res) => {
    try {
        //Find quiz and question document
        const quiz = await PicQuizz.findOne({ quizId: req.params.quizId });
        const question = await findQuestionByType(req.params.questionType, { _id: req.params.questionId });
        
        //Check if quiz or question doesn't exist or question doesn't belong to the quiz
        if (!quiz || !question)
            return res.status(404).send({ error: 'Quiz or question doesn\'t exist' });
        if (!quiz.smallQuestions.some(smallQuestion => 
                                      smallQuestion.info.str == question._id.str ))
            return res.status(400).send({ error: 'The question doesn\'t belong to the quiz' });

        //Updating stuff
        if (req.file)
            req.body.questionImage = await imageBufferProcess(req.file.buffer, 1000);
        logic.updateDocument(question, req.body);

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
        const quiz = await PicQuizz.findOneAndDelete({ quizId: req.params.id });

        if(!quiz) 
            return res.status(404).send();

        quiz.smallQuestions.forEach(async smallQuestion => await deleteQuestionByType(smallQuestion.questionType, { _id: smallQuestion.info._id }));

        quiz.classes.forEach(async classId => {
            const classDoc = await Class.findOne({ classId });
            classDoc && await logic.updateDocument(classDoc, {
                quizList: classDoc.quizList.filter(curQuiz => curQuiz.quiz.str !== quiz._id.str)
            });
        });

        res.send({ message: 'Deleted succesfully' });
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;