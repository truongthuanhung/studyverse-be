import { checkSchema } from 'express-validator';
import { validate } from '~/utils/validation';
import { GroupPrivacy, StudyGroupRole } from '~/constants/enums';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';
import studyGroupsService from '~/services/studyGroups.services';
import { NextFunction, Request, Response } from 'express';
import { TokenPayload } from '~/models/requests/User.requests';
import databaseService from '~/services/database.services';
import { ObjectId } from 'mongodb';
import { numberEnumToArray } from '~/utils/common';
import Question from '~/models/schemas/Question.schema';
import StudyGroupMember from '~/models/schemas/StudyGroupMember.schema';
import { QUESTION_MESSAGES } from '~/constants/messages';

const memberTypes = numberEnumToArray(StudyGroupRole);

export const createStudyGroupValidator = validate(
  checkSchema(
    {
      name: {
        in: ['body'],
        isString: {
          errorMessage: 'Group name must be a string.'
        },
        isLength: {
          options: { min: 3, max: 100 },
          errorMessage: 'Group name must be between 3 and 100 characters.'
        },
        notEmpty: {
          errorMessage: 'Group name is required.'
        }
      },
      privacy: {
        in: ['body'],
        notEmpty: {
          errorMessage: 'Group privacy is required'
        },
        isIn: {
          options: [[GroupPrivacy.Public, GroupPrivacy.Private]],
          errorMessage: `Privacy must be one of: ${Object.values(GroupPrivacy).join(', ')}.`
        }
      },
      description: {
        in: ['body'],
        optional: true,
        isString: {
          errorMessage: 'Description must be a string.'
        },
        isLength: {
          options: { max: 500 },
          errorMessage: 'Description must not exceed 500 characters.'
        }
      },
      cover_photo: {
        in: ['body'],
        optional: true,
        isString: {
          errorMessage: 'Cover photo URL must be a string.'
        },
        isURL: {
          errorMessage: 'Cover photo must be a valid URL.'
        }
      }
    },
    ['body']
  )
);

export const getStudyGroupsValidator = validate(
  checkSchema(
    {
      type: {
        optional: true,
        custom: {
          options: (value: string) => {
            const validTypes = ['all', 'admin', 'member'];
            if (!validTypes.includes(value)) {
              throw new ErrorWithStatus({
                message: `Type must be one of: ${validTypes.join(', ')}`,
                status: HTTP_STATUS.BAD_REQUEST
              });
            }
            return true;
          }
        }
      }
    },
    ['query']
  )
);

export const editStudyGroupValidator = validate(
  checkSchema(
    {
      name: {
        in: ['body'],
        isString: {
          errorMessage: 'Group name must be a string.'
        },
        isLength: {
          options: { min: 3, max: 100 },
          errorMessage: 'Group name must be between 3 and 100 characters.'
        }
      },
      privacy: {
        in: ['body'],
        isIn: {
          options: [[GroupPrivacy.Public, GroupPrivacy.Private]],
          errorMessage: `Privacy must be one of: ${Object.values(GroupPrivacy).join(', ')}.`
        }
      },
      description: {
        in: ['body'],
        optional: true,
        isString: {
          errorMessage: 'Description must be a string.'
        },
        isLength: {
          options: { max: 500 },
          errorMessage: 'Description must not exceed 500 characters.'
        }
      },
      cover_photo: {
        in: ['body'],
        optional: true,
        isString: {
          errorMessage: 'Cover photo URL must be a string.'
        },
        isURL: {
          errorMessage: 'Cover photo must be a valid URL.'
        }
      }
    },
    ['body']
  )
);

export const groupIdValidator = validate(
  checkSchema(
    {
      group_id: {
        isMongoId: {
          errorMessage: 'Invalid group_id'
        },
        custom: {
          options: async (value: string, { req }) => {
            const group = await databaseService.study_groups.findOne({
              _id: new ObjectId(value)
            });
            if (!group) {
              throw new ErrorWithStatus({
                message: 'Study group not found',
                status: HTTP_STATUS.NOT_FOUND
              });
            }
            (req as Request).study_group = group;
            return true;
          }
        }
      }
    },
    ['params']
  )
);

export const questionIdValidator = validate(
  checkSchema(
    {
      question_id: {
        isMongoId: {
          errorMessage: 'Invalid question_id'
        },
        custom: {
          options: async (value: string, { req }) => {
            const question = await databaseService.questions.findOne({
              _id: new ObjectId(value)
            });
            if (!question) {
              throw new ErrorWithStatus({
                message: 'Question not found',
                status: HTTP_STATUS.NOT_FOUND
              });
            }
            if (!question.group_id.equals(req.study_group?._id)) {
              throw new ErrorWithStatus({
                message: 'Question does not belong to study group',
                status: HTTP_STATUS.FORBIDDEN
              });
            }
            (req as Request).question = question;
            return true;
          }
        }
      }
    },
    ['params']
  )
);

export const questionOwnerValidator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const question = req.question as Question;
    const { user_id } = req.decoded_authorization as TokenPayload;
    if (!question || question.user_id.toString() !== user_id) {
      throw new ErrorWithStatus({
        message: 'User has no permission on this question',
        status: HTTP_STATUS.FORBIDDEN
      });
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const deleteQuestionValidator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.member as StudyGroupMember;
    if (role === StudyGroupRole.Admin) {
      return next();
    }
    const question = req.question as Question;
    const { user_id } = req.decoded_authorization as TokenPayload;
    if (!question || question.user_id.toString() !== user_id) {
      return next(
        new ErrorWithStatus({
          message: 'User has no permission on this question',
          status: HTTP_STATUS.FORBIDDEN
        })
      );
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const joinRequestValidator = validate(
  checkSchema(
    {
      join_request_id: {
        isMongoId: {
          errorMessage: 'Invalid join_request_id'
        },
        custom: {
          options: async (value: string, { req }) => {
            const join_request = await databaseService.join_requests.findOne({
              _id: new ObjectId(value)
            });
            if (!join_request) {
              throw new ErrorWithStatus({
                message: 'Join request not found',
                status: HTTP_STATUS.NOT_FOUND
              });
            }
            if (!join_request.group_id.equals((req as Request).study_group?._id)) {
              throw new ErrorWithStatus({
                message: 'Invalid join request',
                status: HTTP_STATUS.BAD_REQUEST
              });
            }
            return true;
          }
        }
      }
    },
    ['params']
  )
);

export const groupAdminValidator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload;
    const { group_id } = req.params;
    const adminMember = await databaseService.study_group_members.findOne({
      user_id: new ObjectId(user_id),
      group_id: new ObjectId(group_id),
      role: StudyGroupRole.Admin
    });

    if (!adminMember) {
      next(
        new ErrorWithStatus({
          status: HTTP_STATUS.FORBIDDEN,
          message: 'User has no permission on this group'
        })
      );
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const adminValidator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.member?.role === StudyGroupRole.Admin) {
      return next();
    }
    throw new ErrorWithStatus({
      status: HTTP_STATUS.FORBIDDEN,
      message: QUESTION_MESSAGES.FORBIDDEN
    });
  } catch (err) {
    next(err);
  }
};

export const groupMemberValidator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.decoded_authorization as TokenPayload;
    const { group_id } = req.params;
    const member = await databaseService.study_group_members.findOne({
      user_id: new ObjectId(user_id),
      group_id: new ObjectId(group_id)
    });

    if (!member) {
      next(
        new ErrorWithStatus({
          status: HTTP_STATUS.FORBIDDEN,
          message: 'User has no permission on this group'
        })
      );
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const getMembersValidator = validate(
  checkSchema({
    role: {
      optional: true,
      isIn: {
        options: [[StudyGroupRole.Admin, StudyGroupRole.Member]],
        errorMessage: `Role must be one of: ${Object.values(StudyGroupRole).join(', ')}.`
      }
    }
  })
);

export const createQuestionValidator = validate(
  checkSchema(
    {
      title: {
        isString: {
          errorMessage: 'Title must be a string'
        },
        isLength: {
          options: {
            min: 1,
            max: 1000
          },
          errorMessage: 'Title must be from 1 to 1000 characters long'
        },
        trim: true
      },
      content: {
        isString: {
          errorMessage: 'Content must be a string'
        },
        isLength: {
          options: {
            min: 1,
            max: 5000
          },
          errorMessage: 'Question content must be from 1 to 5000 characters long'
        },
        trim: true
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

export const editQuestionValidator = validate(
  checkSchema(
    {
      title: {
        optional: true,
        isString: {
          errorMessage: 'Title must be a string'
        },
        isLength: {
          options: {
            min: 1,
            max: 100
          },
          errorMessage: 'Title must be from 1 to 100 characters long'
        },
        trim: true
      },
      content: {
        optional: true,
        isString: {
          errorMessage: 'Content must be a string'
        },
        isLength: {
          options: {
            min: 1,
            max: 5000
          },
          errorMessage: 'Question content must be from 1 to 5000 characters long'
        },
        trim: true
      },
      tags: {
        optional: true,
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
      },
      medias: {
        optional: true,
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

export const validateGroupMembership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { group_id } = req.params;
    const { user_id } = req.decoded_authorization as TokenPayload;

    const [group, member] = await Promise.all([
      databaseService.study_groups.findOne({ _id: new ObjectId(group_id) }),
      databaseService.study_group_members.findOne({
        user_id: new ObjectId(user_id),
        group_id: new ObjectId(group_id)
      })
    ]);

    if (!group) {
      throw new ErrorWithStatus({
        message: 'Study group not found',
        status: HTTP_STATUS.NOT_FOUND
      });
    }

    if (!member) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: 'User has no permission on this group'
      });
    }

    req.study_group = group;
    req.member = member;

    next();
  } catch (err) {
    next(err);
  }
};

export const validateGroupQuestionAndMembership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { group_id, question_id } = req.params;
    const { user_id } = req.decoded_authorization as TokenPayload;

    // Truy vấn đồng thời để giảm thời gian
    const [group, question, member] = await Promise.all([
      databaseService.study_groups.findOne({ _id: new ObjectId(group_id) }),
      databaseService.questions.findOne({ _id: new ObjectId(question_id) }),
      databaseService.study_group_members.findOne({
        user_id: new ObjectId(user_id),
        group_id: new ObjectId(group_id)
      })
    ]);

    // Validation
    if (!group) {
      return next(
        new ErrorWithStatus({
          message: 'Study group not found',
          status: HTTP_STATUS.NOT_FOUND
        })
      );
    }

    if (!question) {
      return next(
        new ErrorWithStatus({
          message: 'Question not found',
          status: HTTP_STATUS.NOT_FOUND
        })
      );
    }

    if (!question.group_id.equals(group._id)) {
      return next(
        new ErrorWithStatus({
          message: 'Question does not belong to study group',
          status: HTTP_STATUS.FORBIDDEN
        })
      );
    }

    if (!member) {
      return next(
        new ErrorWithStatus({
          status: HTTP_STATUS.FORBIDDEN,
          message: 'User has no permission on this group'
        })
      );
    }

    // Lưu các đối tượng vào request để sử dụng ở controller
    req.study_group = group;
    req.question = question;
    req.member = member;
    next();
  } catch (err) {
    next(err);
  }
};

export const validateGroupQuestionReplyAndMembership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { group_id, question_id, reply_id } = req.params;
    const { user_id } = req.decoded_authorization as TokenPayload;

    // Truy vấn đồng thời để giảm thời gian
    const [group, question, reply, member] = await Promise.all([
      databaseService.study_groups.findOne({ _id: new ObjectId(group_id) }),
      databaseService.questions.findOne({ _id: new ObjectId(question_id) }),
      databaseService.replies.findOne({ _id: new ObjectId(reply_id) }),
      databaseService.study_group_members.findOne({
        user_id: new ObjectId(user_id),
        group_id: new ObjectId(group_id)
      })
    ]);

    // Validation
    if (!group) {
      return next(
        new ErrorWithStatus({
          message: 'Study group not found',
          status: HTTP_STATUS.NOT_FOUND
        })
      );
    }

    if (!question) {
      return next(
        new ErrorWithStatus({
          message: 'Question not found',
          status: HTTP_STATUS.NOT_FOUND
        })
      );
    }

    if (!question.group_id.equals(group._id)) {
      return next(
        new ErrorWithStatus({
          message: 'Question does not belong to study group',
          status: HTTP_STATUS.FORBIDDEN
        })
      );
    }

    if (!reply) {
      return next(
        new ErrorWithStatus({
          message: 'Reply not found',
          status: HTTP_STATUS.NOT_FOUND
        })
      );
    }

    if (!reply.question_id.equals(question._id)) {
      return next(
        new ErrorWithStatus({
          message: 'Reply does not belong to question',
          status: HTTP_STATUS.FORBIDDEN
        })
      );
    }

    if (!member) {
      return next(
        new ErrorWithStatus({
          status: HTTP_STATUS.FORBIDDEN,
          message: 'User has no permission on this group'
        })
      );
    }

    // Lưu các đối tượng vào request để sử dụng ở controller
    req.study_group = group;
    req.question = question;
    req.reply = reply;
    req.member = member;
    next();
  } catch (err) {
    next(err);
  }
};

export const inviteFriendsValidator = validate(
  checkSchema(
    {
      invited_user_ids: {
        in: ['body'],
        isArray: {
          errorMessage: 'invited_user_ids must be an array'
        },
        custom: {
          options: async (value, { req }) => {
            if (!Array.isArray(value)) {
              throw new Error('invited_user_ids must be an array');
            }

            // Check if each ID is a valid ObjectId
            const validObjectIds = [];
            for (const id of value) {
              try {
                if (ObjectId.isValid(id)) {
                  validObjectIds.push(new ObjectId(id));
                } else {
                  throw new Error(`${id} is not a valid ObjectId`);
                }
              } catch (error) {
                throw new Error(`${id} is not a valid ObjectId`);
              }
            }

            // Check if each user exists in the database
            const users = await databaseService.users
              .find({
                _id: { $in: validObjectIds }
              })
              .toArray();

            if (users.length !== value.length) {
              throw new Error('One or more users do not exist in the database');
            }

            return true;
          },
          errorMessage: 'Invalid user IDs or users do not exist'
        }
      }
    },
    ['body']
  )
);
