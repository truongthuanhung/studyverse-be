import { Router } from 'express';
import {
  getMeController,
  getProfileController,
  loginController,
  logoutController,
  registerController
} from '~/controllers/users.controllers';
import {
  accessTokenValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator
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
 * Description: Logout a user
 * Path: /logout
 * Method: POST
 * Header: { Authorization: Bearer <access_token> }
 * Body: { refresh_token: string }
 */

usersRouter.post('/logout', accessTokenValidator, refreshTokenValidator, logoutController);

/**
 * Description: Register a new user
 * Path: /register
 * Method: POST
 * Body: { name: string, email: string, password: string, date_of_birth: ISO8601 }
 */
usersRouter.post('/register', registerValidator, wrapRequestHandler(registerController));

/**
 * Description: Get my profile
 * Path: /me
 * Method: GET
 * Header: { Authorization: Bearer <access_token> }
 * Body: {}
 */
usersRouter.get('/me', accessTokenValidator, wrapRequestHandler(getMeController));

/**
 * Description: Get user profile
 * Path: /:username
 * Method: GET
 */
usersRouter.get('/:username', wrapRequestHandler(getProfileController));

export default usersRouter;
