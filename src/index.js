const express = require('express');
const userRouter = require('./routers/user');
const guessPicRouter = require('./routers/guesspic');
require('./db/connector');


const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(userRouter);
app.use(guessPicRouter);

app.listen(port, () => {
    console.log('Server is up on port', port);
})