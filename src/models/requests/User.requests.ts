import { JwtPayload } from 'jsonwebtoken';
import { Gender, TokenType, UserRole, UserVerifyStatus } from '~/constants/enums';

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface RegisterRequestBody {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  gender: Gender;
  confirm_password: string;
  date_of_birth: string;
}

export interface LogoutRequestBody {
  refresh_token: string;
}

export interface TokenPayload extends JwtPayload {
  user_id: string;
  token_type: TokenType;
  verify: UserVerifyStatus;
}

export interface EmailVerifyRequestBody {
  email_verify_token: string;
}

export interface ForgotPasswordRequestBody {
  email: string;
}

export interface VerifyForgotPasswordRequestBody {
  forgot_password_token: string;
}

export interface ResetPasswordRequestBody {
  forgot_password_token: string;
  password: string;
  confirm_password: string;
}

export interface UpdateMeRequestBody {
  name?: string;
  date_of_birth?: string;
  bio?: string;
  location?: string;
  website?: string;
  username?: string;
  avatar?: string;
  cover_photo?: string;
}

export interface FollowRequestBody {
  followed_user_id: string;
}

export interface ChangePasswordRequestBody {
  old_password: string;
  password: string;
  confirm_password: string;
}

export interface RefreshTokenRequestBody {
  refresh_token: string;
}
