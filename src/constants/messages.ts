const USERS_MESSAGES = {
  VALIDATION_ERROR: 'Validation error',
  NAME_IS_REQUIRED: 'Name is required',
  NAME_MUST_BE_A_STRING: 'Name must be a string',
  NAME_LENGTH_MUST_BE_FROM_1_TO_100: 'Name length must be from 1 to 100',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  EMAIL_IS_REQUIRED: 'Email is required',
  EMAIL_IS_INVALID: 'Email is invalid',
  PASSWORD_IS_REQUIRED: 'Password is required',
  PASSWORD_MUST_BE_A_STRING: 'Password must be a string',
  PASSWORD_LENGTH_MUST_BE_FROM_6_TO_50: 'Password length must be from 6 to 50',
  PASSWORD_MUST_BE_STRONG:
    'Password must be 6-50 characters long and contain at least 1 lowercase letter, 1 uppercase letter, 1 number and 1 symbol',
  CONFIRM_PASSWORD_IS_REQUIRED: 'Confirm password is required',
  CONFIRM_PASSWORD_MUST_BE_A_STRING: 'Confirm password must be a string',
  CONFIRM_PASSWORD_LENGTH_MUST_BE_FROM_6_TO_50: 'Confirm password length must be from 6 to 50',
  CONFIRM_PASSWORD_NOT_MATCH: 'Password confirmation does not match password',
  DOB_IS_REQUIRED: 'Date of birth is required',
  DOB_MUST_BE_ISO8601: 'Date of birth must be ISO8601',
  EMAIL_OR_PASSWORD_IS_INCORRECT: 'Email or password is incorrect',
  LOGIN_SUCCESSFULLY: 'Login successfully',
  REGISTER_SUCCESSFULLY: 'Register successfully',
  ACCESS_TOKEN_IS_REQUIRED: 'Access token is required',
  ACCESS_TOKEN_IS_INVALID: 'Access token is invalid',
  REFRESH_TOKEN_IS_REQUIRED: 'Refresh token is required',
  REFRESH_TOKEN_MUST_BE_STRING: 'Refresh token must be string',
  REFRESH_TOKEN_IS_INVALID: 'Refresh token is invalid',
  REFRESH_TOKEN_IS_USED_OR_NOT_EXISTED: 'Refresh token is used or not existed',
  EMAIL_VERIFY_TOKEN_IS_REQUIRED: 'Email verify token is required',
  EMAIL_VERIFY_TOKEN_MUST_BE_STRING: 'Email verify token must be string',
  EMAIL_VERIFY_TOKEN_IS_INVALID: 'Email verify token is invalid',
  USER_NOT_FOUND: 'User not found',
  EMAIL_ALREADY_VERIFIED_BEFORE: 'Email already verified before',
  EMAIL_VERIFIED_SUCCESSFULLY: 'Email verified successfully',
  RESEND_VERIFY_EMAIL_SUCCESSFULLY: 'Resend verify email successfully',
  FORGOT_PASSWORD_TOKEN_IS_REQUIRED: 'Forgot password token is required',
  FORGOT_PASSWORD_TOKEN_MUST_BE_STRING: 'Forgot password token must be string',
  FORGOT_PASSWORD_TOKEN_IS_INVALID: 'Forgot password token is invalid',
  VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESSFULLY: 'Verify forgot password token successfully',
  RESET_PASSWORD_SUCCESSFULLY: 'Reset password successfully',
  GET_ME_SUCCESSFULLY: 'Get me successfully',
  UPDATE_ME_SUCCESSFULLY: 'Update me successfully',
  USER_NOT_VERIFIED: 'User not verify',
  BIO_MUST_BE_A_STRING: 'Bio must be a string',
  BIO_LENGTH: 'Bio length must be from 0 to 200',
  LOCATION_MUST_BE_A_STRING: 'Location must be a string',
  LOCATION_LENGTH: 'Location length must be from 0 to 200',
  WEBSITE_MUST_BE_A_STRING: 'Website must be a string',
  WEBSITE_LENGTH: 'Website length must be from 0 to 200',
  USERNAME_MUST_BE_A_STRING: 'Username must be a string',
  USERNAME_LENGTH: 'Username length must be from 1 to 50',
  IMG_URL_MUST_BE_A_STRING: 'Img URL must be a string',
  IMG_URL_LENGTH: 'Img URL length must be from 1 to 50',
  GET_PROFILE_SUCCESSFULLY: 'Get profile successfully',
  FOLLOW_SUCCESSFULLY: 'Follow successfully',
  INVALID_FOLLOWED_USER_ID: 'Invalid followed user id',
  FOLLOWED: 'Already followed',
  UNFOLLOW_SUCCESSFULLY: 'Unfollow successfully',
  ALREADY_UNFOLLOWED: 'Already unfollowed',
  USERNAME_INVALID: 'Username must be 4-15 characters long and contain only letters, numbers and underscores',
  USERNAME_EXISTED: 'Username existed',
  OLD_PASSWORD_DOES_NOT_MATCH: 'Old password does not match',
  CHANGE_PASSWORD_SUCCESSFULLY: 'Change password successfully',
  GMAIL_NOT_VERIFIED: 'Email not verified',
  GET_NEW_REFRESH_TOKEN_SUCCESSFULLY: 'Get new refresh token successfully',
  ROLE_IS_REQUIRED: 'Role is required',
  INVALID_ROLE: 'Role is invalid',
  GENDER_IS_REQUIRED: 'Gender is required',
  INVALID_GENDER: 'Gender is invalid',
  USER_UNVERIFIED: 'User is unverified',
  USER_BANNED: 'User is banned',
  CANNOT_FOLLOW_SELF: 'Cannot follow yourself',
  CANNOT_UNFOLLOW_SELF: 'Cannot unfollow yourself',
  OLD_PASSWORD_MUST_BE_STRING: 'Old password must be string',
  NO_PERMISSION_CREATE_GROUP: 'User has no permission to create group'
} as const;

export default USERS_MESSAGES;
