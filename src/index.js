const express = require('express');
const multer = require('multer');
const userRouter = require('./routers/user');
const picQuizRouter = require('./routers/pic-quiz');
const classRouter = require('./routers/class');
const skiriblyRouter = require('./routers/scribbly');
require('./db/connector');

const upload = multer();
const app = express();
const port = process.env.PORT;


app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
    next();
})

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(userRouter);
app.use(picQuizRouter);
app.use(classRouter);
app.use(skiriblyRouter);

app.listen(port, () => {
    console.log('Server is up on port', port);
})