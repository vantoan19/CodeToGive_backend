const express = require('express');
const authenticate = require('../middleware/authenticate');
const upload = require('../middleware/upload');
const sharp = require('sharp');
const Question = require('../models/question');
const FillInBlankQuestion = require('../models/fill-in-blank-question');
const MultipleChoiceQuestion = require('../models/multiple-choice-question');
const PicQuiz = require('../models/pic-quiz');

const router = new express.Router();


// @POST /api/pic-quiz/create
// @Desc Create a pic quiz
router.post('/api/pic-quiz/create', authenticate, upload.single('bigQuestionImage'), async (req, res) => {
    if (req.user.accountType !== 'admin') 
        return res.status(400)
                  .send( { error: 'Only admin can create tasks' } );

    const quiz = new PicQuiz(req.body);

    try {
        const buffer = await sharp(req.file.buffer).resize({ fit: sharp.fit.contain, width: 1000 })
                                                   .png().toBuffer();
        quiz.bigQuestionImage = buffer;

        await quiz.save();
        res.status(201)
           .send({ message: 'Created succesfully', quiz });
    } catch (error) {
        res.status(400)
           .send(error);
    }
});

// @POST /api/pic-quiz/:id/new-question
// @Desc Create a new question for a quiz
router.post('/api/pic-quiz/:id/new-question', authenticate, upload.single('questionImage'), async (req, res) => {
    //Only admin
    if (req.user.accountType !== 'admin') 
        return res.status(400).send({ error: 'Only admin can create questions' });

    //Appropriate question document to question type
    let concreteQuestion = null;
    if (req.body.questionType === 'fill-in-blank')
        concreteQuestion = new FillInBlankQuestion(req.body);
    else 
        concreteQuestion = new MultipleChoiceQuestion(req.body);

    try {
        //Get image buffer
        const buffer = await sharp(req.file.buffer).resize({ fit: sharp.fit.contain, width: 1000 })
                                               .png().toBuffer();
        concreteQuestion.questionImage = buffer;

        //Save concreteQuestion and create question
        await concreteQuestion.save();
        const question = new Question({ question: concreteQuestion, 
                                        questionType: (req.body.questionType === "fill-in-blank" ?
                                                                                 "FillInBlankQuestion":
                                                                                 "MultipleChoiceQuestion") });
        await question.save();

        //Link question to current quiz
        const quizId = req.params.id;
        const quiz = await PicQuiz.findOne({ quizId });

        quiz.smallQuestions.push(question);
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
        const quizzes = await PicQuiz.find({}).populate({
            path: 'smallQuestions',
            populate: {
                path: 'question'
            }
        })

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
        const quiz = await PicQuiz.findOne({ quizId }).populate({
            path: 'smallQuestions',
            populate: {
                path: 'question'
            }
        });

        if (!quiz)
            return res.status(404).send({ error: 'Not found' });

        res.send({ message: 'Get data successfully', quiz });
    } catch (error) {
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
        let question = null;
        if (questionType == 'fill-in-blank') 
            question = await FillInBlankQuestion.findOne({ _id: questionId });
        else
            question = await MultipleChoiceQuestion.findOne({ _id: questionId });
        console.log(question);
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
        
        if (req.file) {
            const buffer = await sharp(req.file.buffer).resize({ fit: sharp.fit.contain, width: 1000 })
                                                       .png().toBuffer();
            quiz.bigQuestionImage = buffer;
        }
        updates.forEach(update => quiz[update] = req.body[update]);

        await quiz.save();

        res.send({ message: 'Updated successfully' });
    } catch (error) {
        res.status(400).send(error);
    }
});

// @PATCH /api/pic-quiz/:id/:questionId
// @Desc Modify a question of a task by question's id 
router.patch('/api/pic-quiz/:id/:questionId', authenticate, upload.single('questionImage'), async (req, res) => {
    try {
        //Find quiz and question document
        const quiz = await PicQuiz.findOne({ quizId: req.params.id });
        const question = await Question.findById({ _id: questionId });

        //Check if quiz or question doesn't exist or question doesn't belong to the quiz
        if (!quiz || !question)
            return res.status(404).send({ error: 'Quiz or question doesn\'t exist' });
        if (!quiz.smallQuestions.includes(quiz._id))
            return res.status(400).send({ error: 'The question doesn\'t belong to the quiz' });

        //Get the concrete question
        const concreteQuestion = null;
        if (question.questionType === 'fill-in-blank')
            concreteQuestion = FillInBlankQuestion.findOne({ _id: question.question });
        else 
            concreteQuestion = MultipleChoiceQuestion.findOne({ _id: question.question });

        if (!concreteQuestion)
            return res.status(404).send({ error: 'Question doesn\'t exist' });

        //Updating stuff
        const updates = Object.keys(req.body);
        updates.forEach(update => concreteQuestion[update] = req.body.update);
        const buffer = await sharp(req.file.buffer).resize({ fit: sharp.fit.contain, width: 1000 })
                                                       .png().toBuffer();
        concreteQuestion.questionImage = buffer;
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

        quiz.smallQuestions.forEach(async smallQuestion => {
            const question = await Question.findOneAndDelete({ _id: smallQuestion._id });
            if (question.questionType === 'FillInBlankQuestion')
                await FillInBlankQuestion.findOneAndDelete({ _id: question.question._id });
            else
                await MultipleChoiceQuestion.findOneAndDelete({ _id: question.question._id });
        })
        res.send({ message: 'Deleted succesfully' });
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;