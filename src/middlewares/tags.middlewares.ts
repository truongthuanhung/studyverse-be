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

export const getTagsByUsageInGroupValidator = validate(
  checkSchema({
    order: {
      in: ['query'],
      optional: true,
      isString: {
        errorMessage: 'Order must be a string'
      },
      isIn: {
        options: [['asc', 'desc']],
        errorMessage: 'Order must be either "asc" or "desc"'
      }
    }
  })
);
