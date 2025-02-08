import { PostPrivacy, PostType } from '~/constants/enums';

export interface CreatePostRequestBody {
  content: string;
  privacy: PostPrivacy;
  parent_id: string | null;
  tags: string[];
  mentions: string[];
  medias: string[];
}

export interface SharePostRequestBody {
  content: string;
  privacy: PostPrivacy;
  parent_id: string;
  mentions: string[];
}
