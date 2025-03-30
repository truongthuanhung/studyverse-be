import { checkSchema } from 'express-validator';
import { validate } from '~/utils/validation';

export const groupSearchValidator = validate(
  checkSchema(
    {
      q: {
        optional: true,
        isString: {
          errorMessage: 'Search query must be a string'
        },
        trim: true,
        isLength: {
          options: {
            min: 1,
            max: 50
          },
          errorMessage: 'Search query must be between 1 and 50 characters'
        }
      },
      page: {
        optional: true,
        isInt: {
          options: { min: 1 },
          errorMessage: 'Page must be a positive integer'
        },
        toInt: true
      },
      limit: {
        optional: true,
        isInt: {
          options: { min: 1, max: 100 },
          errorMessage: 'Limit must be a positive integer between 1 and 100'
        },
        toInt: true
      }
    },
    ['query']
  )
);
