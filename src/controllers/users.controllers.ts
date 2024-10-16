import { NextFunction, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ObjectId } from 'mongodb';
import HTTP_STATUS from '~/constants/httpStatus';
import USERS_MESSAGES from '~/constants/messages';
import { ErrorWithStatus } from '~/models/Errors';
import { EmailVerifyRequestBody, RegisterRequestBody, TokenPayload } from '~/models/requests/User.requests';
import databaseService from '~/services/database.services';
import usersService from '~/services/users.services';

export const loginController = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;
  const result = await usersService.login(email, password);
  if (result) {
    return res.json({
      message: 'Login successfully',
      result
    });
  }
  next(
    new ErrorWithStatus({ message: USERS_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT, status: HTTP_STATUS.UNAUTHORIZED })
  );
};

export const registerController = async (req: Request<ParamsDictionary, any, RegisterRequestBody>, res: Response) => {
  const result = await usersService.register(req.body);
  return res.json({
    message: 'Register successfully',
    result
  });
};

export const logoutController = async (req: Request, res: Response, next: NextFunction) => {
  const { refresh_token } = req.body;
  await usersService.logout(refresh_token as string);
  return res.json({
    message: 'Logout successfully'
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
