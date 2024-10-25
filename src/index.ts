import express from 'express';
import usersRouter from './routes/users.routes';
import databaseService from './services/database.services';
import cors from 'cors';
import { defaultErrorHandler } from './middlewares/errors.middlewares';
import { config } from 'dotenv';
config();

const port = process.env.PORT || 3003;
const app = express();

databaseService.connect().catch(console.dir);

app.use(cors());
app.use(express.json());

app.use('/users', usersRouter);

//ERROR HANDLER
app.use(defaultErrorHandler);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
