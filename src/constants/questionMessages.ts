const QUESTION_MESSAGES = {
  CREATE_SUCCESS: 'The question has been successfully created.',
  EDIT_SUCCESS: 'The question has been successfully edited.',
  DELETE_SUCCESS: 'The question has been successfully deleted.',
  RETRIVE_SUCCESS: 'Retrive successfully',
  APPROVE_SUCCESS: 'The question has been successfully approved.',
  REJECT_SUCCESS: 'The question has been rejected.',
  NOT_FOUND: 'The question was not found.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  ALREADY_APPROVED: 'This question has already been approved.',
  ALREADY_REJECTED: 'This question has already been rejected.',
  INVALID_REJECTED: 'You cannot reject this question.'
} as const;

export default QUESTION_MESSAGES;
