const express = require('express');
const User = require('../models/user');
const authenticate = require('../middleware/authenticate');
const upload = require('../middleware/upload');
const sharp = require('sharp');

const router = new express.Router();

// @POST /users/create
// @Desc Create new user
router.post('/users/create', async (req, res) => {
    console.log(req.body);
    const user = new User(req.body);

    try {
        await user.save();
        const token = await user.generateAuthToken();
        res.status(201).send( { message: 'Created successfully', user, token } );
    } catch(error) {
        res.status(400).send(error);
    }
});

// @POST /users/login
// @Desc Log in, create token
router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.account, req.body.password);
        const token = await user.generateAuthToken();
        res.status(201).send( { message: 'Logged in successfully', user, token });
    } catch(error) {
        console.log(error);
        res.status(400).send(error);
    }
});

// @POST /users/logout
// @Desc Log out account on this device
router.post('/users/logout', authenticate, async (req, res) => {
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

// @POST /users/logoutall
// @Desc Log out all sessions
router.post('/users/logoutall', authenticate, async(req, res) => {
    try {
        req.user.tokens = [];

        await req.user.save();

        res.send({ message: 'Logged out all sessions successfully' });
    } catch (error) {
        res.status(500).send(error);
    }
});

// @POST /users/me/avatar
// @Desc Update avatar
router.post('/users/me/avatar', authenticate, upload.single('avatar'),  async (req, res) => {
    try {
        const buffer = await sharp(req.file.buffer).resize({ fit: sharp.fit.contain, width: 250 })
                                                   .png().toBuffer();
        req.user.avatar = buffer;
        await req.user.save();

        res.send({ message: 'Updated avatar successfully' });
    } catch (error) {
        res.status(500).send(error);
    }
}, (error, req, res, next) => {
    res.status(400).send(error);
});

// @POST /users/me/coverPhoto
// @Desc Update cover photo
router.post('/users/me/coverPhoto', authenticate, upload.single('coverPhoto'), async (req, res) => {
    try {
        const buffer = await sharp(req.file.buffer).resize({ fit: sharp.fit.contain, width: 1000 }).png().toBuffer();
        req.user.coverPhoto = buffer;
        await req.user.save();

        res.send({ message: 'Updated coverphoto successfully' });
    } catch (error) {
        res.status(500).send(error);
    }
}, (error, req, res, next) => {
    res.status(400).send(error);
});

// @GET /users/me
// @Desc Get profile
router.get('/users/me', authenticate, async(req, res) => {
    res.send({ message: 'Get data succesfully', user: req.user });
});


// @GET /users/:account
// @Desc Get user's profile without credential
router.get('/users/:account', async(req, res) => {
    try {
        const user = await User.findOne({ account: req.params.account });

        if (!user) throw new Error('User doesn\'t exist');

        res.send({ message: 'Get data succesfully', user });
    } catch (error) {
        res.status(404).send(error);
    }
});

// @GET /users/:account/avatar
// @Desc Get user avatar
router.get('/users/:account/avatar', async(req, res) => {
    try {
        const user = await User.findOne({ account: req.params.account });

        if (!user || !user.avatar) {
            throw new Error('User doesn\'t exist or does not have an avatar');
        }

        res.set('Content-Type', 'image/png');
        res.send(user.avatar);
    } catch (error) {
        res.status(404).send();
    }
});

// @GET /user/:account/coverPhoto
// @Desc Get user coverphoto
router.get('/users/:account/coverPhoto', async(req, res) => {
    try {
        const user = await User.findOne({ account: req.params.account });

        if (!user || !user.coverPhoto) {
            throw new Error('User doesn\'t exist or does not have an avatar');
        }

        res.set('Content-Type', 'image/png');
        res.send(user.coverPhoto);
    } catch (error) {
        res.status(404).send();
    }
});

// @PATCH /users/me
// @Desc Update profile
router.patch('/users/me', authenticate, async(req, res) => {
    const allowedUpdates = ['email', 'firstName', 'lastName', 'dateOfBirth', 
                            'phoneNumber', 'address', 'profileDescription', 'stars', 'takenTasks', 'badges' ];
    const updates = Object.keys(req.body);

    if (!updates.every(update => allowedUpdates.includes(update)))
        return res.status(400).send();

    try {
        updates.forEach(update => req.user[update] = req.body[update]);
        await req.user.save();

        res.send({ message: 'Updated user succesfully', user: req.user });
    } catch (error) {
        res.status(400).send(error);
    }
});

// @DELETE /users/me
// @Desc Delete user
router.delete('/users/me', authenticate, async (req, res) => {
    try {
        await req.user.remove()

        res.send({ message: 'Deleted user successfully', user });
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;