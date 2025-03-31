import { ObjectId } from 'mongodb';

interface IReply {
  _id?: ObjectId;
  user_id: ObjectId;
  question_id: ObjectId;
  parent_id: ObjectId | null;
  medias: string[];
  content: string;
  upvotes?: number;
  downvotes?: number;
  approved_by_user?: boolean;
  approved_by_teacher?: boolean;
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
  upvotes: number;
  downvotes: number;
  approved_by_user: boolean;
  approved_by_teacher: boolean;
  created_at?: Date;
  updated_at?: Date;
  constructor({
    _id,
    user_id,
    question_id,
    parent_id,
    medias,
    content,
    upvotes,
    downvotes,
    approved_by_user,
    approved_by_teacher,
    created_at,
    updated_at
  }: IReply) {
    const date = new Date();
    this._id = _id || new ObjectId();
    this.user_id = user_id;
    this.question_id = question_id;
    this.parent_id = parent_id;
    this.medias = medias;
    this.content = content;
    this.upvotes = upvotes || 0;
    this.downvotes = downvotes || 0;
    this.approved_by_user = approved_by_user || false;
    this.approved_by_teacher = approved_by_teacher || false;
    this.created_at = created_at || date;
    this.updated_at = updated_at || date;
  }
}
