const express = require('express');
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/is-admin');
const Class = require('../models/class');
const PicQuizz = require('../models/pic-quiz');
const User = require('../models/user');
const logic = require('./logic/logic');

const router = express.Router();

const getQuizByType = async (quizType, indexes) => {
    if (quizType === 'PicQuizz')
        return await PicQuizz.findOne(indexes);
    // else if( quizType === 'Skrible')
    //     return await Skrible.findOne(indexes);
    // else
    //     return await quizType.findOne(indexes);
}

// @POST /api/class/create
// @Desc Create a class
router.post('/api/class/create', authenticate, isAdmin, async (req, res) => {
    try {
        const classDoc = await logic.createDocument(Class, req.body);

        res.send({ message: 'Created succesfully', classDoc });
    } catch (error) {
        res.status(400).send(error);
    }
});

// @POST /api/class/:classId/add-student/:account
// @Desc Add an account to a class
router.post('/api/class/:classId/add-student/:account', async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId });
        const student = await User.findOne({ account: req.params.account });

        if (!classDoc || !student)
            throw new Error('Not found');

        student.classes.push(classDoc);
        classDoc.studentList.push(student);

        await student.save();
        await classDoc.save();
        res.send({ message: 'Added succesfully' });
    } catch (error) {
        res.status(404).send(error);
    }
});

// @POST /api/class/:classId/remove-student/:account
// @Desc Remove an account from a class
router.post('/api/class/:classId/remove-student/:account', async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId });
        const student = await User.findOne({ account: req.params.account });

        if (!classDoc || !student)
            throw new Error('Not found');

        student.classes = student.classes.filter(curClass => curClass.str !== classDoc._id.str);
        classDoc.studentList = classDoc.studentList.filter(curStudent => curStudent.str !== student._id.str);

        await student.save();
        await classDoc.save();

        res.send({ message: 'Removed succesfully' });
    } catch (error) {
        res.status(404).send(error);
    }
});

// @GET /api/class/:classId
// @Desc Get information of a class
router.get('/api/class/:classId', async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId })
                                    .populate('studentList', '-avatar -coverPhoto -tokens -password');

        if (!classDoc)
            throw new Error('Not found');

        res.send({ message: 'Get successfully', class: classDoc });
    } catch (error) {
        res.status(400).send(error);
    }
});

// @GET /api/class/:classId/quizzes
// @Desc Get quizzes
router.get('/api/class/:classId/quizzes', async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId })
                                    .populate('quizList.quiz');
        
        if (!classDoc)
            throw new Error('Not found');
        

        res.send({ message: 'Get successfully', quizzes: classDoc.quizList });
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
});


// @PATCH /api/class/:classId
// @Desc Update class
router.patch('/api/class/:classId', authenticate, isAdmin, async (req, res) => {
    try {
        const classDoc = await Class.findOne({ classId: req.params.classId });

        if (Object.keys(req.body).includes('classId')) 
            return res.status(400).send({ error: 'Invalid update' });

        await logic.updateDocument(classDoc, req.body);

        res.send({ message: 'Updated succesfully' });
    } catch (error) {
        res.send(400).send(error);
    }
});



// @DELETE /api/class/:classId
// @Desc Delete class
router.delete('/api/class/:classId', authenticate, isAdmin, async (req, res) => {
    try {
        const classDoc = await Class.findOneAndDelete({ classId: req.params.classId });

        if (!classDoc) 
            return res.status(404).send({ error: 'Not found' });

        classDoc.studentList.forEach(async student => {
            const studentDoc = await User.findOne({ _id: student._id });
            studentDoc && logic.updateDocument(studentDoc, {
                classes: studentDoc.classes.filter(curClass => curClass.str !== classDoc._id.str)
            });
        });

        classDoc.quizList.forEach(async quiz => {
            const quizDoc = await getQuizByType(quiz.quizType, { _id: quiz.quiz._id });
            quizDoc && await logic.updateDocument(quizDoc, {
                classes: quizDoc.classes.filter(curClass => curClass != classDoc.classId)
            });
        });
        
    } catch (error) {
        res.status(400).send(error);
    }
}) 

module.exports = router;