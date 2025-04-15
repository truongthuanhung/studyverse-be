import { checkSchema } from 'express-validator';
import { PostPrivacy, PostType } from '~/constants/enums';
import { validate } from '~/utils/validation';
import { numberEnumToArray } from '~/utils/common';
import { ObjectId } from 'mongodb';
import postsService from '~/services/posts.services';
import { NextFunction, Request, Response } from 'express';
import Post from '~/models/schemas/Post.schema';
import HTTP_STATUS from '~/constants/httpStatus';
import usersService from '~/services/users.services';
import { TokenPayload } from '~/models/requests/User.requests';
import { wrapRequestHandler } from '~/utils/handlers';
import { ErrorWithStatus } from '~/models/Errors';
import { post } from 'axios';

const postTypes = numberEnumToArray(PostType);
const postPrivacies = numberEnumToArray(PostPrivacy);

export const createPostValidator = validate(
  checkSchema(
    {
      content: {
        isString: {
          errorMessage: 'Content must be a string'
        },
        trim: true,
        custom: {
          options: (value: string, { req }) => {
            const type = req.body.type as PostType;
            if (type !== PostType.Post && !value) {
              throw new Error('Content is required');
            }
            return true;
          }
        }
      },
      privacy: {
        isIn: {
          options: [postPrivacies],
          errorMessage: 'Invalid post privacy'
        }
      },
      parent_id: {
        custom: {
          options: (value: string, { req }) => {
            if (value !== null) {
              throw new Error('Parent id is not allowed when creating a post');
            }
            return true;
          }
        }
      },
      tags: {
        isArray: true,
        custom: {
          options: (value, { req }) => {
            if (value.some((item: any) => typeof item !== 'string')) {
              throw new Error('Tags must be an array of string');
            }
            return true;
          }
        }
      },
      mentions: {
        isArray: true,
        custom: {
          options: (value) => {
            if (value.some((item: any) => !ObjectId.isValid(item))) {
              throw new Error('Mentions must be an array of user_id');
            }
            return true;
          }
        }
      },
      medias: {
        isArray: true,
        custom: {
          options: (value) => {
            if (value.some((item: any) => typeof item !== 'string')) {
              throw new Error('Medias must be an array of string');
            }
            return true;
          }
        }
      }
    },
    ['body']
  )
);

export const postIdBodyValidator = validate(
  checkSchema(
    {
      post_id: {
        isMongoId: {
          errorMessage: 'Invalid post id'
        },
        custom: {
          options: async (value: string, { req }) => {
            const post = await postsService.checkPostExists(value);
            req.post = post;
            return true;
          }
        }
      }
    },
    ['body']
  )
);

export const postIdParamValidator = validate(
  checkSchema(
    {
      post_id: {
        isMongoId: {
          errorMessage: 'Invalid post id'
        },
        custom: {
          options: async (value: string, { req }) => {
            const post = await postsService.checkPostExists(value);
            req.post = post;
            return true;
          }
        }
      }
    },
    ['params']
  )
);

export const privacyValidator = wrapRequestHandler(async (req: Request, res: Response, next: NextFunction) => {
  const post = req.post as Post;
  const { user_id } = req.decoded_authorization as TokenPayload;
  if (post.privacy === PostPrivacy.Private) {
    if (post.user_id.toString() !== req.decoded_authorization?.user_id) {
      return next(
        new ErrorWithStatus({
          message: 'You are not allowed to access this post',
          status: HTTP_STATUS.FORBIDDEN
        })
      );
    }
  } else if (post.privacy === PostPrivacy.Friends) {
    if (user_id === post.user_id.toString()) {
      return next();
    }
    const isFriends = await usersService.checkFriends(user_id, post.user_id.toString());
    if (!isFriends) {
      return next(
        new ErrorWithStatus({
          message: 'You are not allowed to access this post',
          status: HTTP_STATUS.FORBIDDEN
        })
      );
    }
  } else if (post.privacy === PostPrivacy.Follower) {
    if (user_id === post.user_id.toString()) {
      return next();
    }
    const isFollower = await usersService.checkFollow(user_id, post.user_id.toString());
    if (!isFollower) {
      return next(
        new ErrorWithStatus({
          message: 'You are not allowed to access this post',
          status: HTTP_STATUS.FORBIDDEN
        })
      );
    }
  }
  next();
});

export const sharePostValidator = validate(
  checkSchema(
    {
      content: {
        isString: {
          errorMessage: 'Content must be a string'
        },
        trim: true
      },
      privacy: {
        isIn: {
          options: [postPrivacies],
          errorMessage: 'Invalid post privacy'
        }
      },
      mentions: {
        optional: true,
        isArray: true,
        custom: {
          options: (value) => {
            if (value.some((item: any) => !ObjectId.isValid(item))) {
              throw new Error('Mentions must be an array of user_id');
            }
            return true;
          }
        }
      }
    },
    ['body']
  )
);
