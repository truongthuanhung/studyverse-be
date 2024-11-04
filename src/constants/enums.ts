export enum UserRole {
  Student = 'student',
  Teacher = 'teacher'
}

export enum Gender {
  Male = 'male',
  Female = 'female',
  Other = 'other'
}

export enum UserVerifyStatus {
  Unverified,
  Verified,
  Banned
}

export enum TokenType {
  AccessToken,
  RefreshToken,
  ForgotPasswordToken,
  EmailVerifyToken
}

export enum ConversationType {
  Direct,
  Group
}
