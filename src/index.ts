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
import studyGroupRouter from './routes/studyGroups.routes';
import bookmarksRouter from './routes/bookmarks.routes';
import likesRouter from './routes/likes.routes';
import postsRouter from './routes/posts.routes';
import commentsRouter from './routes/comments.routes';
import questionsRouter from './routes/questions.routes';
import notificationsRouter from './routes/notifications.routes';
import recommendationsRouter from './routes/recommendations.routes';
import relationshipsRouter from './routes/relationships.routes';
import invitationsRouter from './routes/invitations.routes';
import tagsRouter from './routes/tags.routes';
//import '~/utils/friends_faker';
//import '~/utils/faker';
//import '~/utils/invitations_faker';
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
app.use('/posts', postsRouter);
app.use('/likes', likesRouter);
app.use('/comments', commentsRouter);
app.use('/bookmarks', bookmarksRouter);
app.use('/conversations', conversationsRouter);
app.use('/study-groups/:group_id/questions', questionsRouter);
app.use('/study-groups', studyGroupRouter);
app.use('/notifications', notificationsRouter);
app.use('/recommendations', recommendationsRouter);
app.use('/relationships', relationshipsRouter);
app.use('/invitations', invitationsRouter);
app.use('/tags', tagsRouter);

//ERROR HANDLER
app.use(defaultErrorHandler);

initSocket(httpServer);

httpServer.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
