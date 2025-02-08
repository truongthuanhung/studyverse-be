import { LikeType } from '~/constants/enums';

export interface LikeRequestBody {
  target_id: string;
  type: LikeType;
}
