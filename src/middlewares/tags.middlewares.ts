import { checkSchema } from 'express-validator';
import { validate } from '~/utils/validation';

export const tagIdValidator = validate(
  checkSchema(
    {
      tag_id: {
        isMongoId: {
          errorMessage: 'tag_id must be a valid mongoId'
        }
      }
    },
    ['params']
  )
);
