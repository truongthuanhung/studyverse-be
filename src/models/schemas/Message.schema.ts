import { ObjectId } from 'mongodb';

interface IMessage {
  _id?: ObjectId;
  conversation_id: ObjectId;
  sender_id: ObjectId;
  content: string;
  is_read?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

class Message {
  _id?: ObjectId;
  conversation_id: ObjectId;
  sender_id: ObjectId;
  content: string;
  is_read: boolean;
  created_at: Date;
  updated_at: Date;

  constructor(data: IMessage) {
    const now = new Date();
    this._id = data._id;
    this.conversation_id = data.conversation_id;
    this.sender_id = data.sender_id;
    this.content = data.content;
    this.is_read = data.is_read || false;
    this.created_at = data.created_at || now;
    this.updated_at = data.updated_at || now;
  }
}

export default Message;
