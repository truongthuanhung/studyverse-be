import { NextFunction, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { pick } from 'lodash';
import { ObjectId } from 'mongodb';
import HTTP_STATUS from '~/constants/httpStatus';
import USERS_MESSAGES from '~/constants/messages';
import { ErrorWithStatus } from '~/models/Errors';
import {
  ChangePasswordRequestBody,
  EmailVerifyRequestBody,
  FollowRequestBody,
  RefreshTokenRequestBody,
  RegisterRequestBody,
  ResetPasswordRequestBody,
  TokenPayload,
  UnfollowRequestBody,
  UpdateMeRequestBody,
  VerifyForgotPasswordRequestBody
} from '~/models/requests/User.requests';
import { Follower } from '~/models/schemas/Follower.schema';
import User from '~/models/schemas/User.schema';
import databaseService from '~/services/database.services';
import usersService from '~/services/users.services';
import { generateEmailHTML } from '~/utils/mail';

export const loginController = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as User;
  const user_id = user._id as ObjectId;
  const result = await usersService.login(user_id.toString());
  return res.json({
    message: USERS_MESSAGES.LOGIN_SUCCESSFULLY,
    result
  });
};

export const oauthController = async (req: Request, res: Response, next: NextFunction) => {
  const { code } = req.query;
  const result = await usersService.oauth(code as string);
  return res.redirect(
    `http://localhost:3000/oauth?access_token=${result.access_token}&refresh_token=${result.refresh_token}&new_user=${result.new_user}`
  );
};

export const registerController = async (req: Request<ParamsDictionary, any, RegisterRequestBody>, res: Response) => {
  const result = await usersService.register(req.body);
  res.json({
    message: 'Register successfully'
  });
  await usersService.sendEmail(
    {
      header: 'Verify email',
      content: generateEmailHTML(result.email_verify_token)
    },
    req.body.email
  );
};

export const logoutController = async (req: Request, res: Response, next: NextFunction) => {
  const { refresh_token } = req.body;
  await usersService.logout(refresh_token as string);
  return res.json({
    message: 'Logout successfully'
  });
};

export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefreshTokenRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_refresh_token as TokenPayload;
  const { refresh_token } = req.body;
  const result = await usersService.getNewRefreshToken(user_id, refresh_token);
  return res.json({
    message: USERS_MESSAGES.GET_NEW_REFRESH_TOKEN_SUCCESSFULLY,
    result
  });
};

export const emailVerifyController = async (
  req: Request<ParamsDictionary, any, EmailVerifyRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_email_verify_token as TokenPayload;
  const user = await databaseService.users.findOne({
    _id: new ObjectId(user_id)
  });
  if (!user) {
    next(
      new ErrorWithStatus({
        message: USERS_MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    );
  }
  if (user?.email_verify_token === '') {
    return res.json({
      message: USERS_MESSAGES.EMAIL_ALREADY_VERIFIED_BEFORE
    });
  }
  const result = await usersService.verifyEmail(user_id);
  return res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.EMAIL_VERIFIED_SUCCESSFULLY,
    result
  });
};

export const forgotPasswordController = async (req: Request, res: Response) => {
  const user_id = req.user?._id?.toString() as string;
  const email = req.user?.email as string;
  await usersService.forgotPassword(user_id, email);
  return res.json({
    message: 'Forgot password email sent successfully'
  });
};

export const verifyForgotPasswordController = async (req: Request, res: Response) => {
  const { forgot_password_token } = req.query;
  return res.json({
    message: USERS_MESSAGES.VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESSFULLY,
    result: {
      forgot_password_token
    }
  });
};

export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordRequestBody>,
  res: Response,
  next: NextFunction
) => {
  const { password } = req.body;
  const { user_id } = req.decoded_forgot_password_token as TokenPayload;
  const result = await usersService.resetPassword({ user_id, password });
  return res.json(result);
};

export const getMeController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const user = await databaseService.users.findOne(
    { _id: new ObjectId(user_id) },
    {
      projection: {
        password: 0,
        email_verify_token: 0,
        forgot_password_token: 0
      }
    }
  );
  return res.json({
    message: USERS_MESSAGES.GET_ME_SUCCESSFULLY,
    result: user
  });
};

export const updateMeController = async (req: Request<ParamsDictionary, any, UpdateMeRequestBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await usersService.updateMe(user_id, req.body);
  return res.json({
    message: USERS_MESSAGES.UPDATE_ME_SUCCESSFULLY,
    result
  });
};

export const getProfileController = async (req: Request, res: Response, next: NextFunction) => {
  const { username } = req.params;
  const user = await usersService.getProfile(username);
  if (!user) {
    return next(
      new ErrorWithStatus({
        message: USERS_MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.NOT_FOUND
      })
    );
  }
  return res.json({
    message: USERS_MESSAGES.GET_PROFILE_SUCCESSFULLY,
    result: user
  });
};

export const followController = async (req: Request<ParamsDictionary, any, FollowRequestBody>, res: Response) => {
  const { followed_user_id } = req.body;
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await usersService.follow(user_id, followed_user_id);
  return res.json(result);
};

export const unfollowController = async (req: Request<ParamsDictionary, any, UnfollowRequestBody>, res: Response) => {
  const { unfollowed_user_id } = req.body;
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await usersService.unfollow(user_id, unfollowed_user_id);
  return res.json(result);
};

export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordRequestBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { password } = req.body;
  const result = await usersService.changePassword(user_id, password);
  return res.json(result);
};

export const getUsersController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload;
  const result = await usersService.getUsers(user_id);
  return res.json({
    message: 'Get users list successfully',
    result
  });
};
