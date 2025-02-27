import { Router } from 'express';
import {
  getFollowersController,
  getFollowingsController,
  getFriendsController
} from '~/controllers/relationships.controllers';
import {
  changePasswordController,
  emailVerifyController,
  followController,
  forgotPasswordController,
  getFollowStatsController,
  getMeController,
  getProfileController,
  getUsersController,
  loginController,
  logoutController,
  oauthController,
  refreshTokenController,
  registerController,
  resetPasswordController,
  unfollowController,
  updateMeController,
  verifyForgotPasswordController
} from '~/controllers/users.controllers';
import { filterMiddleware, paginationValidator } from '~/middlewares/common.middlewares';
import {
  accessTokenValidator,
  changePasswordValidator,
  emailVerifyTokenValidator,
  followValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  unfollowValidator,
  updateMeValidator,
  verifyForgotPasswordValidator
} from '~/middlewares/users.middlewares';
import { wrapRequestHandler } from '~/utils/handlers';

const usersRouter = Router();

/**
 * Description: Login a user
 * Path: /login
 * Method: POST
 * Body: { email: string, password: string }
 */

usersRouter.post('/login', loginValidator, wrapRequestHandler(loginController));

/**
 * Description: Get list user
 * Path: /login
 * Method: GET
 * Header: { Authorization: Bearer <access_token> }
 * Body: {}
 */

usersRouter.get('/', accessTokenValidator, wrapRequestHandler(getUsersController));

/**
 * Description: Login a user with oauth
 * Path: /oauth/google
 * Method: GET
 * Query: { code: string }
 */
usersRouter.get('/oauth/google', wrapRequestHandler(oauthController));

/**
 * Description: Logout a user
 * Path: /logout
 * Method: POST
 * Header: { Authorization: Bearer <access_token> }
 * Body: { refresh_token: string }
 */

usersRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapRequestHandler(logoutController));

/**
 * Description: Register a new user
 * Path: /register
 * Method: POST
 * Body: { name: string, email: string, password: string, date_of_birth: ISO8601 }
 */
usersRouter.post('/register', registerValidator, wrapRequestHandler(registerController));

/**
 * Description: Verify email
 * Path: /verify-email
 * Method: POST
 * Body: { email_verify_token: string }
 */
usersRouter.post('/verify-email', emailVerifyTokenValidator, wrapRequestHandler(emailVerifyController));

/**
 * Description: Forgot password
 * Path: /forgot-password
 * Method: POST
 * Body: { email: string }
 */
usersRouter.post('/forgot-password', forgotPasswordValidator, wrapRequestHandler(forgotPasswordController));

/**
 * Description: Verify forgot password token
 * Path: /verify-forgot-password
 * Method: POST
 * Body: { forgot_password_token: string }
 */
usersRouter.post(
  '/verify-forgot-password',
  verifyForgotPasswordValidator,
  wrapRequestHandler(verifyForgotPasswordController)
);

/**
 * Description: Reset password
 * Path: /reset-password
 * Method: POST
 * Body: { forgot_password_token: string, password: string, confirm_password: string }
 */
usersRouter.post('/reset-password', resetPasswordValidator, wrapRequestHandler(resetPasswordController));

usersRouter.post('/refresh-token', refreshTokenValidator, wrapRequestHandler(refreshTokenController));

/**
 * Description: Get my profile
 * Path: /me
 * Method: GET
 * Header: { Authorization: Bearer <access_token> }
 * Body: {}
 */
usersRouter.get('/me', accessTokenValidator, wrapRequestHandler(getMeController));

/**
 * Description: Update my profile
 * Path: /me
 * Method: PATCH
 * Header: { Authorization: Bearer <access_token> }
 * Body: { name: string, date_of_birth: string, bio: string, location: string, website: string, username: string, avatar: string, cover_photo: string}
 */
usersRouter.patch(
  '/me',
  accessTokenValidator,
  updateMeValidator,
  filterMiddleware(['name', 'date_of_birth', 'bio', 'location', 'website', 'username', 'avatar', 'cover_photo']),
  wrapRequestHandler(updateMeController)
);

/**
 * Description: Get follow stats
 * Path: /follow-stats
 * Method: GET
 */
usersRouter.get('/follow-stats', accessTokenValidator, wrapRequestHandler(getFollowStatsController));

usersRouter.get('/friends', accessTokenValidator, paginationValidator, wrapRequestHandler(getFriendsController));
usersRouter.get('/followers', accessTokenValidator, paginationValidator, wrapRequestHandler(getFollowersController));
usersRouter.get('/followings', accessTokenValidator, paginationValidator, wrapRequestHandler(getFollowingsController));

/**
 * Description: Get user profile
 * Path: /:username
 * Method: GET
 */
usersRouter.get('/:username', accessTokenValidator, wrapRequestHandler(getProfileController));

/**
 * Description: Follow someone
 * Path: /follow
 * Method: POST
 * Header: { Authorization: Bearer <access_token> }
 * Body: { followed_user_id: string }
 */
usersRouter.post(
  '/follow',
  accessTokenValidator,
  followValidator,
  filterMiddleware(['followed_user_id']),
  wrapRequestHandler(followController)
);

/**
 * Description: Unfollow someone
 * Path: /unfollow
 * Method: POST
 * Header: { Authorization: Bearer <access_token> }
 * Body: { followed_user_id: string }
 */
usersRouter.post('/unfollow', accessTokenValidator, unfollowValidator, wrapRequestHandler(unfollowController));

/**
 * Description: Change password
 * Path: /change-password
 * Method: PUT
 * Header: { Authorization: Bearer <access_token> }
 * Body: { old_password: string, password: string, confirm_password: string }
 */
usersRouter.put(
  '/change-password',
  accessTokenValidator,
  changePasswordValidator,
  wrapRequestHandler(changePasswordController)
);

export default usersRouter;
