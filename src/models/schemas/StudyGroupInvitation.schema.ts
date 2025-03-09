import { ObjectId } from 'mongodb';
import { InvitationStatus } from '~/constants/enums';

interface IStudyGroupInvitation {
  _id?: ObjectId;
  group_id: ObjectId;
  created_user_id: ObjectId;
  invited_user_id: ObjectId;
  status: InvitationStatus;
  created_at?: Date;
}

class StudyGroupInvitation {
  _id?: ObjectId;
  group_id: ObjectId;
  created_user_id: ObjectId;
  invited_user_id: ObjectId;
  status: InvitationStatus;
  created_at: Date;
  constructor({ _id, group_id, created_user_id, invited_user_id, status, created_at }: IStudyGroupInvitation) {
    this._id = _id;
    this.group_id = group_id;
    this.created_user_id = created_user_id;
    this.invited_user_id = invited_user_id;
    this.status = status;
    this.created_at = created_at || new Date();
  }
}

export default StudyGroupInvitation;
