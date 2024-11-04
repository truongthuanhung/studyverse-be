import { ObjectId } from 'mongodb';
import { ConversationType } from '~/constants/enums';

interface IConversation {
  _id?: ObjectId;
  participants: ObjectId[];
  type: ConversationType;
  last_message: {
    content: string;
    sender_id: ObjectId;
  };
  unread_count: {
    [participant_id: string]: number;
  };
  created_at?: Date;
  updated_at?: Date;
}
class Conversation {
  _id?: ObjectId;
  participants: ObjectId[];
  type: ConversationType;
  last_message: {
    content: string;
    sender_id: ObjectId;
  };
  unread_count: {
    [participant_id: string]: number;
  };
  created_at: Date;
  updated_at: Date;

  constructor(data: IConversation) {
    const now = new Date();
    this._id = data._id;
    this.participants = data.participants;
    this.type = data.type;
    this.last_message = data.last_message;
    this.unread_count = data.unread_count;
    this.created_at = data.created_at || now;
    this.updated_at = data.updated_at || now;
  }
}

export default Conversation;
