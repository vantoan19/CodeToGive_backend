const express = require('express');
const authenticate = require('../middleware/authenticate');
const GuessPicTask = require('../models/guesspic');

const router = new express.Router();

router.post('/guesspic/create', authenticate, async (req, res) => {
    const task = new GuessPicTask(req.body);

    if (req.user.accountType !== 'admin') return res.status(400).send( { error: 'Only admin can crete tasks' } );

    try {
        await task.save();
        res.status(201).send({ message: 'Created succesfully', task });
    } catch (error) {
        res.status(400).send(error);
    }
});


router.get('/guesspic/:id', async (req, res) => {
    const taskId = req.params.id;

    try {
        const task = await GuessPicTask.findOne( { taskId });
        
        if (!task) return res.status(404).send();

        res.send({ message: 'Get data successfully', task });
    } catch (error) {
        res.status(500).send(error);
    }
});

router.patch('/guesspic/:id', authenticate, async (req, res) => {
    if (req.user.accountType !== 'admin') return res.status(400).send( { error: 'Only admin can modify this task' });

    const taskId = req.params.id;
    const updates = Object.keys(req.body);

    if (updates.includes('taskId')) return res.status(400).send({ error: 'Invalid update!' });

    try {
        const task = await GuessPicTask.findOne({ taskId });
        updates.forEach(update => task[update] = req.body[update]);
        await task.save();
        res.send({ message: 'Updated successfully', task });
    } catch (error) {
        res.status(400).send(error);
    }
});


router.delete('/guesspic/:id', authenticate, async (req, res) => {
    if (req.user.accountType !== 'admin') return res.status(400).send( { error: 'Only admin can delete this task'} );

    const taskId = req.params.id;

    try {
        const task = await GuessPicTask.findOneAndDelete( {taskId} );

        if(!task) return res.status(404).send();

        res.send({ message: 'Deleted succesfully', task });
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;