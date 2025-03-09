import { Router } from 'express';
import { followUserController, unfollowUserController } from '~/controllers/relationships.controllers';
import { filterMiddleware } from '~/middlewares/common.middlewares';
import { followValidator, unfollowValidator } from '~/middlewares/relationships.middlewares';
import { accessTokenValidator } from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const relationshipsRouter = Router();

/**
 * Description: Follow someone
 * Path: /follow
 * Method: POST
 * Header: { Authorization: Bearer <access_token> }
 * Body: { followed_user_id: string }
 */
relationshipsRouter.post(
  '/follow',
  accessTokenValidator,
  followValidator,
  filterMiddleware(['followed_user_id']),
  wrapRequestHandler(followUserController)
);

/**
 * Description: Unfollow someone
 * Path: /unfollow
 * Method: POST
 * Header: { Authorization: Bearer <access_token> }
 * Body: { followed_user_id: string }
 */
relationshipsRouter.post(
  '/unfollow',
  accessTokenValidator,
  unfollowValidator,
  wrapRequestHandler(unfollowUserController)
);

export default relationshipsRouter;
