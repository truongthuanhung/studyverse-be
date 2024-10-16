import User from '~/models/schemas/User.schema';
import databaseService from './database.services';
import { LoginRequestBody, RegisterRequestBody } from '~/models/requests/User.requests';
import { hashPassword } from '~/utils/crypto';
import { signToken } from '~/utils/jwt';
import { config } from 'dotenv';
import { TokenType } from '~/constants/enums';
import RefreshToken from '~/models/schemas/RefreshToken.schema';
import { ObjectId } from 'mongodb';
config();

class UsersService {
  private signAccessToken(user_id: string) {
    return signToken({
      payload: {
        user_id,
        token_type: TokenType.AccessToken
      },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
      options: {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN
      }
    });
  }

  private signRefreshToken(user_id: string) {
    return signToken({
      payload: {
        user_id,
        token_type: TokenType.RefreshToken
      },
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
      options: {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN
      }
    });
  }

  async checkRefreshTokenExist(token: string) {
    const rt = await databaseService.refresh_token.findOne({ token });
    return Boolean(rt);
  }

  async checkEmailExist(email: string) {
    const user = await databaseService.users.findOne({ email });
    return Boolean(user);
  }

  async register(payload: RegisterRequestBody) {
    const newId = new ObjectId();
    const result = await databaseService.users.insertOne(
      new User({
        ...payload,
        _id: newId,
        username: newId.toString(),
        date_of_birth: new Date(payload.date_of_birth),
        password: hashPassword(payload.password)
      })
    );
    const user_id = result.insertedId;
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id.toString()),
      this.signRefreshToken(user_id.toString())
    ]);
    await databaseService.refresh_token.insertOne(new RefreshToken({ user_id: user_id, token: refresh_token }));
    return {
      access_token,
      refresh_token
    };
  }

  async login(email: string, password: string) {
    const user = await databaseService.users.findOne({
      email,
      password: hashPassword(password)
    });
    if (user) {
      const [access_token, refresh_token] = await Promise.all([
        this.signAccessToken(user._id.toString()),
        this.signRefreshToken(user._id.toString())
      ]);
      await databaseService.refresh_token.insertOne(new RefreshToken({ user_id: user._id, token: refresh_token }));
      return {
        access_token,
        refresh_token
      };
    }
    return null;
  }

  async logout(refresh_token: string) {
    await databaseService.refresh_token.deleteOne({ token: refresh_token });
  }

  async getProfile(username: string) {
    const user = await databaseService.users.findOne(
      {
        username
      },
      {
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0,
          verify: 0,
          created_at: 0,
          updated_at: 0
        }
      }
    );
    return user;
  }
}

const usersService = new UsersService();
export default usersService;
