import { GroupPrivacy } from "~/constants/enums";

export interface CreateStudyGroupRequestBody {
  name: string;
  privacy: GroupPrivacy;
  description: string;
  cover_photo: string;
}

export interface EditStudyGroupRequestBody {
  name?: string;
  privacy?: GroupPrivacy;
  description?: string;
  cover_photo?: string;
}
