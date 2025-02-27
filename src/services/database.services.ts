import { MongoClient, Db, Collection } from 'mongodb';
import User from '~/models/schemas/User.schema';
import { config } from 'dotenv';
import RefreshToken from '~/models/schemas/RefreshToken.schema';
import { Follower } from '~/models/schemas/Follower.schema';
import Conversation from '~/models/schemas/Conversation.schema';
import Message from '~/models/schemas/Message.schema';
import StudyGroup from '~/models/schemas/StudyGroup.schema';
import StudyGroupMember from '~/models/schemas/StudyGroupMember.schema';
import JoinRequest from '~/models/schemas/JoinRequest.schema';
import Post from '~/models/schemas/Post.schema';
import Bookmark from '~/models/schemas/Bookmark.schema';
import Like from '~/models/schemas/Like.schema';
import Comment from '~/models/schemas/Comment.schema';
import Question from '~/models/schemas/Question.schema';
import Vote from '~/models/schemas/Vote.schema';
import Reply from '~/models/schemas/Reply.schema';
import Notification from '~/models/schemas/Notification.schema';

config();
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@studyverse.otnmy.mongodb.net/?retryWrites=true&w=majority&appName=StudyVerse`;
class DatabaseService {
  public client: MongoClient;
  private db: Db;
  constructor() {
    this.client = new MongoClient(uri);
    this.db = this.client.db(process.env.DB_NAME);
  }
  async connect() {
    try {
      // Send a ping to confirm a successful connection
      await this.db.command({ ping: 1 });
      console.log('Pinged your deployment. You successfully connected to MongoDB!');
      //await this.createIndexes();
      //await this.removeIndexes();
      //await this.checkIndexes();
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
  private async checkIndexes() {
    const indexes = await databaseService.questions.indexes();
    console.log('Indexes:', indexes);
  }
  private async createIndexes() {
    try {
      await this.questions.createIndex({ group_id: 1, created_at: -1 });
      await this.votes.createIndex({ target_id: 1, user_id: 1, type: 1 });
      await this.replies.createIndex({ question_id: 1 });
      console.log('Indexes created successfully!');
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  }
  private async removeIndexes() {
    try {
      await this.questions.dropIndex('group_id_1_created_at_-1');
      await this.votes.dropIndex('target_id_1_user_id_1_type_1');
      await this.replies.dropIndex('question_id_1');
      console.log('Indexes deleted successfully');
    } catch (error) {
      console.error('Error deleting indexes:', error);
    }
  }

  get users(): Collection<User> {
    return this.db.collection('users');
  }
  get refresh_token(): Collection<RefreshToken> {
    return this.db.collection('refresh_tokens');
  }
  get followers(): Collection<Follower> {
    return this.db.collection('followers');
  }
  get posts(): Collection<Post> {
    return this.db.collection('posts');
  }
  get likes(): Collection<Like> {
    return this.db.collection('likes');
  }
  get comments(): Collection<Comment> {
    return this.db.collection('comments');
  }
  get bookmarks(): Collection<Bookmark> {
    return this.db.collection('bookmarks');
  }
  get conversations(): Collection<Conversation> {
    return this.db.collection('conversations');
  }
  get messages(): Collection<Message> {
    return this.db.collection('messages');
  }
  get study_groups(): Collection<StudyGroup> {
    return this.db.collection('study_groups');
  }
  get study_group_members(): Collection<StudyGroupMember> {
    return this.db.collection('study_group_members');
  }
  get join_requests(): Collection<JoinRequest> {
    return this.db.collection('join_requests');
  }
  get questions(): Collection<Question> {
    return this.db.collection('questions');
  }
  get votes(): Collection<Vote> {
    return this.db.collection('votes');
  }
  get replies(): Collection<Reply> {
    return this.db.collection('replies');
  }
  get notifications(): Collection<Notification> {
    return this.db.collection('notifications');
  }
}

const databaseService = new DatabaseService();
export default databaseService;
