import express from 'express';
import usersRouter from './routes/users.routes';
import databaseService from './services/database.services';
import cors from 'cors';
import { defaultErrorHandler } from './middlewares/errors.middlewares';
import { config } from 'dotenv';
import mediasRouter from './routes/medias.routes';
import { initFolder } from './utils/file';
import { UPLOAD_DIRIRECTORY, UPLOAD_TEMP_DIRECTORY } from './constants/directories';
import conversationsRouter from './routes/conversations.routes';
import { createServer } from 'http';
import initSocket from './configs/socket';
config();

const port = process.env.PORT || 3003;
const app = express();
const httpServer = createServer(app);

initFolder(UPLOAD_DIRIRECTORY);
initFolder(UPLOAD_TEMP_DIRECTORY);

databaseService.connect().catch(console.dir);

app.use(cors());
app.use(express.json());

app.use('/users', usersRouter);
app.use('/medias', mediasRouter);
app.use('/conversations', conversationsRouter);

//ERROR HANDLER
app.use(defaultErrorHandler);

initSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
