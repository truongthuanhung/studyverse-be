import { Gender, UserRole } from './../constants/enums';
import { NextFunction, Request, Response } from 'express';
import { checkSchema } from 'express-validator';
import { JsonWebTokenError } from 'jsonwebtoken';
import HTTP_STATUS from '~/constants/httpStatus';
import USERS_MESSAGES from '~/constants/messages';
import { ErrorWithStatus } from '~/models/Errors';
import usersService from '~/services/users.services';
import { verifyToken } from '~/utils/jwt';
import { validate } from '~/utils/validation';

export const loginValidator = validate(
  checkSchema(
    {
      email: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_REQUIRED
        },
        isEmail: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
        },
        trim: true
      },
      password: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.PASSWORD_IS_REQUIRED
        },
        isString: {
          errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_A_STRING
        }
      }
    },
    ['body']
  )
);

export const registerValidator = validate(
  checkSchema(
    {
      name: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.NAME_IS_REQUIRED
        },
        isString: {
          errorMessage: USERS_MESSAGES.NAME_MUST_BE_A_STRING
        },
        isLength: {
          options: {
            min: 1,
            max: 100
          },
          errorMessage: USERS_MESSAGES.NAME_LENGTH_MUST_BE_FROM_1_TO_100
        },
        trim: true
      },
      email: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_REQUIRED
        },
        isEmail: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
        },
        trim: true,
        custom: {
          options: async (value) => {
            const user = await usersService.checkEmailExist(value);
            if (user) {
              throw new ErrorWithStatus({ message: USERS_MESSAGES.EMAIL_ALREADY_EXISTS, status: 400 });
            }
            return true;
          }
        }
      },
      password: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.PASSWORD_IS_REQUIRED
        },
        isString: {
          errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_A_STRING
        },
        isLength: {
          options: {
            min: 6,
            max: 50
          },
          errorMessage: USERS_MESSAGES.PASSWORD_LENGTH_MUST_BE_FROM_6_TO_50
        },
        isStrongPassword: {
          options: {
            minLength: 6,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1
          },
          errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_STRONG
        }
      },
      confirm_password: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED
        },
        isString: {
          errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_A_STRING
        },
        custom: {
          options: (value, { req }) => {
            if (value !== req.body.password) {
              throw new Error(USERS_MESSAGES.CONFIRM_PASSWORD_NOT_MATCH);
            }
            return true;
          }
        }
      },
      date_of_birth: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.DOB_MUST_BE_ISO8601
        },
        isISO8601: {
          options: {
            strict: true,
            strictSeparator: true
          },
          errorMessage: USERS_MESSAGES.DOB_MUST_BE_ISO8601
        }
      },
      role: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.ROLE_IS_REQUIRED
        },
        custom: {
          options: (value: UserRole) => {
            const isEnumValue = Object.values(UserRole).includes(value);
            if (!isEnumValue) {
              throw new Error(USERS_MESSAGES.INVALID_ROLE);
            }
            return true;
          }
        }
      },
      gender: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.ROLE_IS_REQUIRED
        },
        custom: {
          options: (value: Gender) => {
            const isEnumValue = Object.values(Gender).includes(value);
            if (!isEnumValue) {
              throw new Error(USERS_MESSAGES.INVALID_GENDER);
            }
            return true;
          }
        }
      }
    },
    ['body']
  )
);

export const accessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        custom: {
          options: async (value: string, { req }) => {
            const access_token = (value || '').split(' ')[1];
            if (!access_token) {
              throw new ErrorWithStatus({
                message: USERS_MESSAGES.ACCESS_TOKEN_IS_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED
              });
            }
            try {
              const decoded_authorization = await verifyToken({
                token: access_token,
                secretOrPublicKey: process.env.JWT_SECRET_ACCESS_TOKEN as string
              });
              (req as Request).decoded_authorization = decoded_authorization;
            } catch (error) {
              throw new ErrorWithStatus({
                message: (error as JsonWebTokenError).message,
                status: HTTP_STATUS.UNAUTHORIZED
              });
            }
            return true;
          }
        }
      }
    },
    ['headers']
  )
);

export const refreshTokenValidator = validate(
  checkSchema(
    {
      refresh_token: {
        trim: true,
        custom: {
          options: async (value: string, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED,
                message: USERS_MESSAGES.REFRESH_TOKEN_IS_REQUIRED
              });
            }
            try {
              const decoded_refresh_token = await verifyToken({
                token: value,
                secretOrPublicKey: process.env.JWT_SECRET_REFRESH_TOKEN as string
              });
              (req as Request).decoded_refresh_token = decoded_refresh_token;
            } catch (error) {
              throw new ErrorWithStatus({
                message: (error as JsonWebTokenError).message,
                status: HTTP_STATUS.UNAUTHORIZED
              });
            }
            const refresh_token = await usersService.checkRefreshTokenExist(value);
            if (!refresh_token) {
              throw new ErrorWithStatus({
                message: USERS_MESSAGES.REFRESH_TOKEN_IS_USED_OR_NOT_EXISTED,
                status: HTTP_STATUS.UNAUTHORIZED
              });
            }
            return true;
          }
        }
      }
    },
    ['body']
  )
);

export const emailVerifyTokenValidator = validate(
  checkSchema(
    {
      email_verify_token: {
        trim: true,
        custom: {
          options: async (value: string, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: USERS_MESSAGES.EMAIL_VERIFY_TOKEN_IS_REQUIRED,
                status: HTTP_STATUS.UNAUTHORIZED
              });
            }
            try {
              const decoded_email_verify_token = await verifyToken({
                token: value,
                secretOrPublicKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string
              });
              (req as Request).decoded_email_verify_token = decoded_email_verify_token;
              return true;
            } catch (error) {
              throw new ErrorWithStatus({
                message: (error as JsonWebTokenError).message,
                status: HTTP_STATUS.UNAUTHORIZED
              });
            }
          }
        }
      }
    },
    ['query']
  )
);