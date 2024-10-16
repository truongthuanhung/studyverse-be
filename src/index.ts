import express, { NextFunction, Request, Response } from 'express';
import usersRouter from './routes/users.routes';
import databaseService from './services/database.services';
import { ErrorWithStatus } from './models/Errors';
import HTTP_STATUS from './constants/httpStatus';
import { defaultErrorHandler } from './middlewares/errors.middlewares';

const port = 3000;
const app = express();

databaseService.connect().catch(console.dir);

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello world');
});

app.use('/users', usersRouter);

//ERROR HANDLER
app.use(defaultErrorHandler);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
