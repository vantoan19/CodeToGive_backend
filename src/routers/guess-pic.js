const express = require('express');
const authenticate = require('../middleware/authenticate');
const GuessPicQuiz = require('../models/guess-pic');
const upload = require('../middleware/upload');
const sharp = require('sharp');

const router = new express.Router();

router.post('/guesspic/create', authenticate, upload.single('guessImage'), async (req, res) => {
    if (req.user.accountType !== 'admin') 
        return res.status(400).send( { error: 'Only admin can crete tasks' } );

    const quiz = new GuessPicQuiz(req.body);
    const buffer = await sharp(req.file.buffer).resize({ fit: sharp.fit.contain, width: 250 })
                                                   .png().toBuffer();

    console.log(req.body.options);
    for (let i = 0, j = 0; i < req.body.miniQuestion.length; ++i) {
        let question = {};
        question.question = req.body.miniQuestion[i];
        question.questionType = req.body.questionType[i];
        if (question.questionType === 'multiple-choice') {
            question.options = [];
            for(let k = 0; k < 4; ++k) {
                question.options.push(req.body.options[j]);
                j++;
            }
        }
        question.answer = req.body.answer[i];
        console.log(question);
        quiz.miniQuestions.push(question);
    }

    console.log(quiz);
    quiz.guessImage = buffer;

    try {
        await quiz.save();
        res.status(201).send({ message: 'Created succesfully', quiz });
    } catch (error) {
        res.status(400).send(error);
    }
});


router.get('/guesspic/:id', async (req, res) => {
    const quizId = req.params.id;

    try {
        const quiz = await GuessPicQuiz.findOne({ quizId });
        
        if (!quiz) return res.status(404).send();

        res.send({ message: 'Get data successfully', quiz });
    } catch (error) {
        res.status(500).send(error);
    }
});

router.patch('/guesspic/:id', authenticate, async (req, res) => {
    if (req.user.accountType !== 'admin') 
        return res.status(400).send( { error: 'Only admin can modify this task' });

    const quizId = req.params.id;
    const updates = Object.keys(req.body);

    if (updates.includes('quizId')) 
        return res.status(400).send({ error: 'Invalid update!' });

    try {
        const quiz = await GuessPicQuiz.findOne({ quizId });
        updates.forEach(update => quiz[update] = req.body[update]);
        await quiz.save();
        res.send({ message: 'Updated successfully', quiz });
    } catch (error) {
        res.status(400).send(error);
    }
});


router.delete('/guesspic/:id', authenticate, async (req, res) => {
    if (req.user.accountType !== 'admin') 
        return res.status(400).send( { error: 'Only admin can delete this task'} );

    const quizId = req.params.id;

    try {
        const quiz = await GuessPicQuiz.findOneAndDelete( {quizId} );

        if(!quiz) return res.status(404).send();

        res.send({ message: 'Deleted succesfully', quiz });
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;