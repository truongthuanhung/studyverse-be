import { ObjectId } from 'mongodb';
import { PostPrivacy, PostType } from '~/constants/enums';

interface IPost {
  _id?: ObjectId;
  content: string;
  type: PostType;
  privacy: PostPrivacy;
  user_id: ObjectId;
  parent_id: ObjectId | null;
  tags?: ObjectId[];
  medias?: string[];
  mentions?: ObjectId[];
  like_count?: number;
  comment_count?: number;
  user_views?: number;
  created_at?: Date;
  updated_at?: Date;
}

class Post {
  _id?: ObjectId;
  content: string;
  type: PostType;
  privacy: PostPrivacy;
  user_id: ObjectId;
  parent_id: ObjectId | null;
  tags: ObjectId[];
  medias: string[];
  mentions: ObjectId[];
  like_count: number;
  comment_count: number;
  user_views: number;
  created_at: Date;
  updated_at: Date;

  constructor(post: IPost) {
    const date = new Date();
    this._id = post._id;
    this.content = post.content;
    this.type = post.type;
    this.privacy = post.privacy;
    this.user_id = post.user_id;
    this.parent_id = post.parent_id;
    this.tags = post.tags || [];
    this.medias = post.medias || [];
    this.mentions = post.mentions || [];
    this.like_count = post.like_count || 0;
    this.comment_count = post.comment_count || 0;
    this.user_views = post.user_views || 0;
    this.created_at = post.created_at || date;
    this.updated_at = post.updated_at || date;
  }
}

export default Post;
