const express = require('express');
const userRouter = require('./routers/user');
const guessPicRouter = require('./routers/guesspic');
require('./db/connector');


const app = express();
const port = process.env.PORT;

app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
    next();
})

app.use(userRouter);
app.use(guessPicRouter);

app.listen(port, () => {
    console.log('Server is up on port', port);
})