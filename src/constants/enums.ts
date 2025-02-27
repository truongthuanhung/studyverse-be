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

export enum GroupPrivacy {
  Public,
  Private
}

export enum StudyGroupRole {
  Admin,
  Member,
  Guest
}

export enum PostType {
  Post,
  SharePost,
  GroupPost
}

export enum PostPrivacy {
  Public,
  Friends,
  Follower,
  Private
}

export enum LikeType {
  PostLike,
  CommentLike
}

export enum QuestionStatus {
  Pending,
  Open,
  Resolved,
  Closed,
  Rejected
}

export enum VoteType {
  Upvote,
  Downvote
}

export enum GroupTargetType {
  Question,
  Reply
}

export enum NotificationType {
  Group,
  Personal
}

export enum NotificationStatus {
  Unread,
  Read
}
