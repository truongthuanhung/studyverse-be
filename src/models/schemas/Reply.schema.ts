import { ObjectId } from 'mongodb';

interface IReply {
  _id?: ObjectId;
  user_id: ObjectId;
  question_id: ObjectId;
  parent_id: ObjectId | null;
  medias: string[];
  content: string;
  created_at?: Date;
  updated_at?: Date;
}

export default class Reply {
  _id: ObjectId;
  user_id: ObjectId;
  question_id: ObjectId;
  parent_id: ObjectId | null;
  medias: string[];
  content: string;
  created_at?: Date;
  updated_at?: Date;
  constructor({ _id, user_id, question_id, parent_id, medias, content, created_at, updated_at }: IReply) {
    const date = new Date();
    this._id = _id || new ObjectId();
    this.user_id = user_id;
    this.question_id = question_id;
    this.parent_id = parent_id;
    this.medias = medias;
    this.content = content;
    this.created_at = created_at || date;
    this.updated_at = updated_at || date;
  }
}
