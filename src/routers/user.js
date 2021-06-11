const express = require('express');
const User = require('../models/user');
const authenticate = require('../middleware/authenticate');
const upload = require('../middleware/upload');
const sharp = require('sharp');
const logic = require('./logic/logic');
const { update } = require('../models/user');
const Class = require('../models/class');

const router = new express.Router();

// @POST api/users/create
// @Desc Create new user
router.post('/api/users/create', async (req, res) => {
    try {
        const user = await logic.createDocument(User, req.body);
        const token = await user.generateAuthToken();
        console.log(user);
        res.status(201).send( { message: 'Created successfully', user, token } );
    } catch(error) {
        res.status(400).send(error);
    }
});

// @POST /api/users/login
// @Desc Log in, create token
router.post('/api/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.account, req.body.password);
        const token = await user.generateAuthToken();

        res.status(201).send( { message: 'Logged in successfully', user, token });
    } catch(error) {
        res.status(400).send(error);
    }
});

// @POST /api/users/logout
// @Desc Log out account on this device
router.post('/api/users/logout', authenticate, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token;
        });
        await req.user.save();

        res.send({ message: 'Logged out successfully' });
    } catch(error) {
        res.status(500).send(error);
    }
});

// @POST /api/users/logoutall
// @Desc Log out all sessions
router.post('/api/users/logoutall', authenticate, async(req, res) => {
    try {
        req.user.tokens = [];
        await req.user.save();

        res.send({ message: 'Logged out all sessions successfully' });
    } catch (error) {
        res.status(500).send(error);
    }
});

// @POST /api/users/me/avatar
// @Desc Update avatar
router.post('/api/users/me/avatar', authenticate, upload.single('avatar'),  async (req, res) => {
    try {
        req.user.avatar = await logic.imageBufferProcess(req.file.buffer, 250);
        await req.user.save();

        res.send({ message: 'Updated avatar successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).send(error);
    }
}, (error, req, res, next) => {
    res.status(400).send(error);
});

// @POST api/users/me/coverPhoto
// @Desc Update cover photo
router.post('/api/users/me/coverPhoto', authenticate, upload.single('coverPhoto'), async (req, res) => {
    try {
        req.user.coverPhoto = await logic.imageBufferProcess(req.file.buffer, 1000);
        await req.user.save();

        res.send({ message: 'Updated coverphoto successfully' });
    } catch (error) {
        res.status(500).send(error);
    }
}, (error, req, res, next) => {
    res.status(400).send(error);
});

// @GET /api/users/me
// @Desc Get profile
router.get('/api/users/me', authenticate, async(req, res) => {
    await req.user.populate('takenQuizzes.quiz').execPopulate();
    await req.user.populate('classes', '-studentList -quizList').execPopulate();
    res.send({ message: 'Get data succesfully', user: req.user });
});


// @GET /users/:account
// @Desc Get user's profile without credential
router.get('/api/users/:account', async(req, res) => {
    try {
        const user = await User.findOne({ account: req.params.account });

        if (!user) throw new Error('User doesn\'t exist');

        res.send({ message: 'Get data succesfully', user });
    } catch (error) {
        res.status(404).send(error);
    }
});

// @GET /api/users/:account/avatar
// @Desc Get user avatar
router.get('/api/users/:account/avatar', async(req, res) => {
    try {
        const user = await User.findOne({ account: req.params.account });

        if (!user || !user.avatar) 
            throw new Error('User doesn\'t exist or does not have an avatar');

        res.set('Content-Type', 'image/png');
        res.send(user.avatar);
    } catch (error) {
        res.status(404).send();
    }
});

// @GET /api/user/:account/coverPhoto
// @Desc Get user coverphoto
router.get('/api/users/:account/coverPhoto', async(req, res) => {
    try {
        const user = await User.findOne({ account: req.params.account });

        if (!user || !user.coverPhoto) 
            throw new Error('User doesn\'t exist or does not have an avatar');

        res.set('Content-Type', 'image/png');
        res.send(user.coverPhoto);
    } catch (error) {
        res.status(404).send();
    }
});

// @PATCH /api/users/me
// @Desc Update profile
router.patch('/api/users/me', authenticate, async(req, res) => {
    if (Object.keys(req.body).includes('account'))
        return res.status(400).send({ error: 'Invalid update' });

    try {
        await logic.updateDocument(req.user, req.body);

        res.send({ message: 'Updated user succesfully', user: req.user });
    } catch (error) {
        res.status(400).send(error);
    }
});

// @DELETE /api/users/me
// @Desc Delete user
router.delete('/api/users/me', authenticate, async (req, res) => {
    try {
        await req.user.remove();

        req.user.classes.forEach(async classId => {
            const classDoc = await Class.findOne({ _id: classId._id });
            classDoc && await logic.updateDocument(classDoc, {
                studentList: classDoc.studentList.filter(student => student.str !== req.user._id.str )
            });
        })

        res.send({ message: 'Deleted user successfully', user: req.user });
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;