const NOTIFICATION_MESSAGES = {
  RETRIVE_SUCCESS: 'Retrieve notifications successfully',
  GET_UNREAD_SUCCESS: 'Get unread count successfully',
  MARK_AS_READ_SUCCESS: 'Notification marked as read successfully',
  READ_SUCCESS: 'Read notification successfully',
  DELETE_SUCCESS: 'Notification deleted successfully',
  NOT_FOUND: 'Notification not found',
  INVALID_ID: 'Invalid mongo id'
} as const;

export default NOTIFICATION_MESSAGES;
