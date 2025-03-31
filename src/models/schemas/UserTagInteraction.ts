import { ObjectId } from 'mongodb';
import { InteractionType } from '~/constants/enums';

interface IUserTagInteraction {
  user_id: ObjectId;
  tag_id: ObjectId;
  interaction_score: number;
  last_interacted_at?: Date;
  created_at?: Date;
}

class UserTagInteraction {
  user_id: ObjectId;
  tag_id: ObjectId;
  interaction_score?: number;
  created_at: Date;
  last_interacted_at: Date;

  constructor({ user_id, tag_id, interaction_score, created_at, last_interacted_at }: IUserTagInteraction) {
    const date = new Date();
    this.user_id = user_id;
    this.tag_id = tag_id;
    this.interaction_score = interaction_score || 0;
    this.created_at = created_at || date;
    this.last_interacted_at = last_interacted_at || date;
  }
}

export default UserTagInteraction;
