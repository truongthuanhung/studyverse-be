import express from 'express';
import usersRouter from './routes/users.routes';
import databaseService from './services/database.services';
import cors from 'cors';
import { defaultErrorHandler } from './middlewares/errors.middlewares';
import { config } from 'dotenv';
import mediasRouter from './routes/medias.routes';
import { initFolder } from './utils/file';
import { UPLOAD_DIRIRECTORY, UPLOAD_TEMP_DIRECTORY } from './constants/directories';
config();

const port = process.env.PORT || 3003;
const app = express();

initFolder(UPLOAD_DIRIRECTORY);
initFolder(UPLOAD_TEMP_DIRECTORY);

databaseService.connect().catch(console.dir);

app.use(cors());
app.use(express.json());

app.use('/users', usersRouter);
app.use('/medias', mediasRouter);

//ERROR HANDLER
app.use(defaultErrorHandler);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
