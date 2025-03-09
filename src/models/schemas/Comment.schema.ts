import { ObjectId } from 'mongodb';

interface IComment {
  _id?: ObjectId;
  user_id: ObjectId;
  post_id: ObjectId;
  parent_id: ObjectId | null;
  content: string;
  created_at?: Date;
  updated_at?: Date;
}
export default class Comment {
  _id: ObjectId;
  user_id: ObjectId;
  post_id: ObjectId;
  parent_id: ObjectId | null;
  content: string;
  created_at?: Date;
  updated_at?: Date;
  constructor({ _id, user_id, post_id, parent_id, content, created_at, updated_at }: IComment) {
    const date = new Date();
    this._id = _id || new ObjectId();
    this.user_id = user_id;
    this.post_id = post_id;
    this.parent_id = parent_id;
    this.content = content;
    this.created_at = created_at || date;
    this.updated_at = updated_at || date;
  }
}
