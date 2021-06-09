const express = require('express');
const sharp = require('sharp');
const authenticate = require('../middleware/authenticate');
const upload = require('../middleware/upload');
const PicQuiz = require('../models/pic-quiz');
const FillInBlankQuestion = require('../models/fill-in-blank-question');
const MultipleChoiceQuestion = require('../models/multiple-choice-question');

const router = new express.Router();

//Logic
const imageBufferProcess = async (originBuffer, width) => 
                            await sharp(originBuffer).resize({ fit: sharp.fit.contain, width })
                                                     .png()
                                                     .toBuffer();
                                                              
const getDocumentByType = (questionType, obj) => 
    questionType === 'fill-in-blank' ? new FillInBlankQuestion(obj) : new MultipleChoiceQuestion(obj);

const getModelNameByType = (questionType) => 
    questionType === 'fill-in-blank' ? 'FillInBlankQuestion' : 'MultipleChoiceQuestion';

const findQuestionByType = async (questionType, indexes) =>
    questionType === 'fill-in-blank' 
                 ? await FillInBlankQuestion.findOne(indexes) 
                 : await MultipleChoiceQuestion.findOne(indexes);

const deleteQuestionByType = async (questionType, indexes) =>
    questionType === 'fill-in-blank' 
                ? await FillInBlankQuestion.deleteOne(indexes) 
                : await MultipleChoiceQuestion.deleteOne(indexes);

const findOneAndPopulateQuiz = async (indexes) => await PicQuiz.findOne(indexes)
                                                               .populate('smallQuestions.info');
                                                    

// @POST /api/pic-quiz/create
// @Desc Create a pic quiz
router.post('/api/pic-quiz/create', authenticate, upload.single('bigQuestionImage'), async (req, res) => {
    if (req.user.accountType !== 'admin') 
        return res.status(400).send( { error: 'Only admin can create tasks' } );

    const quiz = new PicQuiz(req.body);

    try {
        quiz.bigQuestionImage = await imageBufferProcess(req.file.buffer, 1000);
        await quiz.save();
        
        res.status(201).send({ message: 'Created succesfully', quiz });
    } catch (error) {
        res.status(400).send(error);
    }
});

// @POST /api/pic-quiz/:id/new-question
// @Desc Create a new question for a quiz
router.post('/api/pic-quiz/:id/new-question', authenticate, upload.single('questionImage'), async (req, res) => {
    //Only admin
    if (req.user.accountType !== 'admin') 
        return res.status(400).send({ error: 'Only admin can create questions' });

    //Appropriate question document to question type
    let concreteQuestion = getDocumentByType(req.body.questionType, req.body);

    try {
        concreteQuestion.questionImage = await imageBufferProcess(req.file.buffer, 1000);
        await concreteQuestion.save();

        //Link question to current quiz
        const quizId = req.params.id;
        const quiz = await PicQuiz.findOne({ quizId });
        quiz.smallQuestions.push({ 
            info: concreteQuestion, 
            questionType: getModelNameByType(req.body.questionType) 
        });
        quiz.save();

        res.status(201).send({ message: 'Created successfully' });
    } catch (error) {
        res.status(400).send(error);
    }
});



//===================================================================================
//===================================================================================

// @GET /api/pic-quiz/need-to-do
// @Desc Get need to do
router.get('/api/pic-quiz/need-to-do', async (req, res) => {
    try {
        const quizzes = await PicQuiz.find({}).populate('smallQuestions.info')
                                              .populate('participants.participant');

        if (!quizzes) 
            throw new Error('Not found');

        res.send({ message: 'Get succesfully', quizzes });
    } catch (error) {
        res.status(404).send(error);
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
        const quiz = await PicQuiz.findOne({ quizId });

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
router.patch('/api/pic-quiz/:id', authenticate, upload.single('bigQuestionImage'), async (req, res) => {
    if (req.user.accountType !== 'admin') 
        return res.status(400).send( { error: 'Only admin can modify this task' });

    const quizId = req.params.id;
    const updates = Object.keys(req.body);

    if (updates.includes('quizId')) 
        return res.status(400).send({ error: 'Invalid update!' });

    try {
        const quiz = await PicQuiz.findOne({ quizId });
        
        if (req.file) 
            quiz.bigQuestionImage = await imageBufferProcess(req.file.buffer, 1000);
        updates.forEach(update => quiz[update] = req.body[update]);
        await quiz.save();

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
        const quiz = await PicQuiz.findOne({ quizId: req.params.quizId });
        const question = await findQuestionByType(req.params.questionType, { _id: req.params.questionId });
        
        //Check if quiz or question doesn't exist or question doesn't belong to the quiz
        if (!quiz || !question)
            return res.status(404).send({ error: 'Quiz or question doesn\'t exist' });
        if (!quiz.smallQuestions.some(smallQuestion => smallQuestion.info.str == question._id.str ))
            return res.status(400).send({ error: 'The question doesn\'t belong to the quiz' });

        //Updating stuff
        if (req.file)
            question.questionImage = await imageBufferProcess(req.file.buffer, 1000);
        const updates = Object.keys(req.body);
        updates.forEach(update => question[update] = req.body[update]);
        await question.save();

        res.send({ message: 'Updated succesfully '});
    } catch (error) {
        res.status(400).send(error);
    }
});

//===================================================================================
//===================================================================================

// @DELETE /api/pic-quiz/:id
// @Desc Delete a quiz
router.delete('/api/pic-quiz/:id', authenticate, async (req, res) => {
    if (req.user.accountType !== 'admin') 
        return res.status(400).send( { error: 'Only admin can delete this task'} );

    const quizId = req.params.id;

    try {
        const quiz = await PicQuiz.findOneAndDelete({ quizId });

        if(!quiz) return res.status(404).send();

        quiz.smallQuestions
            .forEach(async smallQuestion => 
                    await deleteQuestionByType(smallQuestion.questionType, { _id: smallQuestion.info._id }));

        res.send({ message: 'Deleted succesfully' });
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;