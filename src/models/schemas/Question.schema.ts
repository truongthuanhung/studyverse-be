import { ObjectId } from 'mongodb';
import { QuestionStatus } from '~/constants/enums';

interface IQuestion {
  _id?: ObjectId;
  title: string;
  content: string;
  status: QuestionStatus;
  user_id: ObjectId;
  group_id: ObjectId;
  tags: ObjectId[];
  medias: string[];
  mentions: ObjectId[];
  approved_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

export default class Question {
  _id?: ObjectId;
  title: string;
  content: string;
  status: QuestionStatus;
  user_id: ObjectId;
  group_id: ObjectId;
  tags: ObjectId[];
  medias: string[];
  mentions: ObjectId[];
  approved_at: Date | null;
  created_at: Date;
  updated_at: Date;
  constructor(question: IQuestion) {
    const date = new Date();
    this._id = question._id;
    this.title = question.title;
    this.content = question.content;
    this.status = question.status;
    this.user_id = question.user_id;
    this.group_id = question.group_id;
    this.tags = question.tags;
    this.medias = question.medias;
    this.mentions = question.mentions;
    this.approved_at = question.approved_at || null;
    this.created_at = question.created_at || date;
    this.updated_at = question.updated_at || date;
  }
}
