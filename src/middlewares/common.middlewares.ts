import { NextFunction, Request, Response } from 'express';
import { checkSchema } from 'express-validator';
import { pick } from 'lodash';
import { validate } from '~/utils/validation';

export const filterMiddleware = (filterKeys: string[]) => (req: Request, res: Response, next: NextFunction) => {
  req.body = pick(req.body, filterKeys);
  next();
};

export const paginationValidator = validate(
  checkSchema(
    {
      page: {
        optional: true,
        isInt: {
          errorMessage: 'Page must be a positive integer',
          options: { min: 1 }
        },
        toInt: true
      },
      limit: {
        optional: true,
        isInt: {
          errorMessage: 'Limit must be a positive integer',
          options: { min: 1 }
        },
        toInt: true
      }
    },
    ['query']
  )
);
