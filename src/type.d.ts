import { Request } from 'express';
import User from './models/schemas/User.schema';
import { TokenPayload } from './models/requests/User.requests';
import Post from './models/schemas/Post.schema';
import StudyGroup from './models/schemas/StudyGroup.schema';
declare module 'express' {
  interface Request {
    user?: User;
    post?: Post;
    question?: Question;
    study_group?: StudyGroup;
    decoded_authorization?: TokenPayload;
    decoded_refresh_token?: TokenPayload;
    decoded_email_verify_token?: TokenPayload;
    decoded_forgot_password_token?: TokenPayload;
  }
}
