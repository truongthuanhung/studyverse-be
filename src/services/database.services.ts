import { MongoClient, Db, Collection } from 'mongodb';
import User from '~/models/schemas/User.schema';
import { config } from 'dotenv';
import RefreshToken from '~/models/schemas/RefreshToken.schema';
import { Follower } from '~/models/schemas/Follower.schema';

config();
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@studyverse.otnmy.mongodb.net/?retryWrites=true&w=majority&appName=StudyVerse`;
class DatabaseService {
  private client: MongoClient;
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
    } catch (err) {
      console.log(err);
      throw err;
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
}

const databaseService = new DatabaseService();
export default databaseService;
