import { ObjectId } from 'mongodb';
import { LikeType } from '~/constants/enums';

interface ILike {
  _id?: ObjectId;
  user_id: ObjectId;
  target_id: ObjectId;
  type: LikeType;
  created_at?: Date;
}
export default class Like {
  _id: ObjectId;
  user_id: ObjectId;
  target_id: ObjectId;
  type: LikeType;
  created_at?: Date;
  constructor({ _id, user_id, target_id, type, created_at }: ILike) {
    this._id = _id || new ObjectId();
    this.user_id = user_id;
    this.target_id = target_id;
    this.type = type;
    this.created_at = created_at || new Date();
  }
}
