import { ObjectId } from 'mongodb';
import { GroupTargetType, VoteType } from '~/constants/enums';

interface IVote {
  _id?: ObjectId;
  user_id: ObjectId;
  target_id: ObjectId;
  type: VoteType;
  target_type: GroupTargetType;
  created_at?: Date;
}

class Vote {
  _id?: ObjectId;
  user_id: ObjectId;
  target_id: ObjectId;
  type: VoteType;
  target_type: GroupTargetType;
  created_at: Date;

  constructor({ _id, user_id, target_id, type, target_type, created_at }: IVote) {
    this._id = _id;
    this.user_id = user_id;
    this.target_id = target_id;
    this.type = type;
    this.target_type = target_type;
    this.created_at = created_at || new Date();
  }
}

export default Vote;
