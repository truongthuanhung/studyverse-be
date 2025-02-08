import User from '~/models/schemas/User.schema';
import databaseService from './database.services';
import { LoginRequestBody, RegisterRequestBody, UpdateMeRequestBody } from '~/models/requests/User.requests';
import { hashPassword } from '~/utils/crypto';
import { signToken } from '~/utils/jwt';
import { config } from 'dotenv';
import { ConversationType, Gender, TokenType, UserRole, UserVerifyStatus } from '~/constants/enums';
import RefreshToken from '~/models/schemas/RefreshToken.schema';
import { ObjectId } from 'mongodb';
import nodemailer from 'nodemailer';
import { generateForgotPasswordEmail } from '~/utils/mail';
import USERS_MESSAGES from '~/constants/messages';
import { ErrorWithStatus } from '~/models/Errors';
import axios from 'axios';
import { Follower } from '~/models/schemas/Follower.schema';
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

  private signEmailVerifyToken(user_id: string) {
    return signToken({
      payload: {
        user_id,
        token_type: TokenType.EmailVerifyToken
      },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
      options: {
        expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRES_IN
      }
    });
  }

  async signForgotPasswordToken(user_id: string) {
    return signToken({
      payload: {
        user_id,
        token_type: TokenType.ForgotPasswordToken
      },
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
      options: {
        expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRES_IN
      }
    });
  }

  async sendEmail(data: any, email: string) {
    let transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD
      }
    });
    await transporter.sendMail({
      from: `"no-reply StudyVerse" <${process.env.MAIL_USERNAME}>`,
      to: email,
      subject: data.header,
      html: data.content
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

  async checkUsernameExist(user_id: string, username: string): Promise<boolean> {
    const user = await databaseService.users.findOne({
      username,
      _id: { $ne: new ObjectId(user_id) }
    });
    return Boolean(user);
  }

  async checkUserExists(user_id: string) {
    const user = await databaseService.users.findOne({
      _id: new ObjectId(user_id)
    });
    return Boolean(user);
  }

  async findUserByIdAndPassword(user_id: string, password: string) {
    const user = await databaseService.users.findOne({
      _id: new ObjectId(user_id),
      password: hashPassword(password)
    });
    return Boolean(user);
  }

  async register(payload: RegisterRequestBody) {
    const user_id = new ObjectId();
    const email_verify_token = await this.signEmailVerifyToken(user_id.toString());
    await databaseService.users.insertOne(
      new User({
        ...payload,
        _id: user_id,
        username: user_id.toString(),
        date_of_birth: new Date(payload.date_of_birth),
        password: hashPassword(payload.password),
        email_verify_token
      })
    );
    return {
      email_verify_token
    };
  }

  async login(user_id: string) {
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ]);
    await databaseService.refresh_token.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: refresh_token })
    );
    return {
      access_token,
      refresh_token
    };
  }

  private async getOauthGoogleToken(code: string) {
    const body = {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    };
    const { data } = await axios.post('https://oauth2.googleapis.com/token', body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return data;
  }
  private async getGoogleUserInfo(access_token: string, id_token: string) {
    const { data } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      params: {
        access_token,
        alt: 'json'
      },
      headers: {
        Authorization: `Bearer ${id_token}`
      }
    });
    return data as {
      id: string;
      email: string;
      verified_email: boolean;
      name: string;
    };
  }

  async oauth(code: string) {
    const { id_token, access_token } = await this.getOauthGoogleToken(code);
    const result = await this.getGoogleUserInfo(access_token, id_token);
    if (!result.verified_email) {
      throw new ErrorWithStatus({
        status: 400,
        message: USERS_MESSAGES.GMAIL_NOT_VERIFIED
      });
    }
    const user = await databaseService.users.findOne({
      email: result.email
    });
    if (user) {
      const user_id = user._id.toString();
      const [access_token, refresh_token] = await Promise.all([
        this.signAccessToken(user_id),
        this.signRefreshToken(user_id),
        databaseService.users.updateOne(
          {
            _id: new ObjectId(user_id)
          },
          {
            $set: {
              verify: UserVerifyStatus.Verified
            },
            $currentDate: {
              updated_at: true
            }
          }
        )
      ]);
      await databaseService.refresh_token.insertOne(
        new RefreshToken({ user_id: new ObjectId(user_id), token: refresh_token })
      );
      return {
        access_token,
        refresh_token,
        new_user: 0
      };
    } else {
      const password = Math.random().toString(36).substring(2, 15);
      const user_id = new ObjectId();
      await databaseService.users.insertOne(
        new User({
          _id: user_id,
          email: result.email,
          name: result.name,
          date_of_birth: new Date(),
          password: hashPassword(password),
          role: UserRole.Student,
          gender: Gender.Other
        })
      );
      const [access_token, refresh_token] = await Promise.all([
        this.signAccessToken(user_id.toString()),
        this.signRefreshToken(user_id.toString())
      ]);

      return {
        access_token,
        refresh_token,
        new_user: 1
      };
    }
  }

  async logout(refresh_token: string) {
    await databaseService.refresh_token.deleteOne({ token: refresh_token });
  }
  async getNewRefreshToken(user_id: string, token: string) {
    const [access_token, refresh_token, _] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id),
      databaseService.refresh_token.deleteOne({
        token
      })
    ]);
    await databaseService.refresh_token.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: refresh_token })
    );
    return {
      access_token,
      refresh_token
    };
  }

  async verifyEmail(user_id: string) {
    const [_, access_token, refresh_token] = await Promise.all([
      databaseService.users.updateOne(
        {
          _id: new ObjectId(user_id)
        },
        {
          $set: {
            email_verify_token: '',
            verify: UserVerifyStatus.Verified
          },
          $currentDate: {
            updated_at: true
          }
        }
      ),
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ]);
    await databaseService.refresh_token.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: refresh_token })
    );
    return {
      access_token,
      refresh_token
    };
  }

  async forgotPassword(user_id: string, email: string) {
    const forgot_password_token = await this.signForgotPasswordToken(user_id);
    await databaseService.users.updateOne(
      {
        _id: new ObjectId(user_id)
      },
      {
        $set: {
          forgot_password_token
        },
        $currentDate: {
          updated_at: true
        }
      }
    );
    await this.sendEmail(
      {
        header: 'Forgot password',
        content: generateForgotPasswordEmail(forgot_password_token)
      },
      email
    );
  }

  async resetPassword({ user_id, password }: { user_id: string; password: string }) {
    await databaseService.users.updateOne(
      {
        _id: new ObjectId(user_id)
      },
      {
        $set: {
          password: hashPassword(password),
          forgot_password_token: ''
        },
        $currentDate: {
          updated_at: true
        }
      }
    );
    return {
      message: USERS_MESSAGES.RESET_PASSWORD_SUCCESSFULLY
    };
  }

  async getMe(user_id: string) {
    // Tìm user dựa trên user_id
    const userObjectId = new ObjectId(user_id);
    const user = await databaseService.users.findOne(
      {
        _id: userObjectId
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

    if (!user) {
      return null; // Nếu không tìm thấy user
    }

    // Tính toán số lượng followers
    const followerCountPromise = databaseService.followers.countDocuments({
      followed_user_id: userObjectId
    });

    // Tính toán số lượng followings
    const followingCountPromise = databaseService.followers.countDocuments({
      user_id: userObjectId
    });

    // Tính toán số lượng friends (mutual followers)
    const friendsCountPromise = databaseService.followers
      .aggregate([
        {
          $match: {
            user_id: userObjectId
          }
        },
        {
          $lookup: {
            from: 'followers',
            let: { following: '$followed_user_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$followed_user_id', userObjectId] }, { $eq: ['$user_id', '$$following'] }]
                  }
                }
              }
            ],
            as: 'mutualFollow'
          }
        },
        {
          $match: {
            mutualFollow: { $ne: [] }
          }
        },
        {
          $count: 'friendsCount'
        }
      ])
      .toArray();

    const [followerCount, followingCount, friendsResult] = await Promise.all([
      followerCountPromise,
      followingCountPromise,
      friendsCountPromise
    ]);

    const friendsCount = friendsResult.length > 0 ? friendsResult[0].friendsCount : 0;

    return {
      ...user,
      followers: followerCount,
      followings: followingCount,
      friends: friendsCount
    };
  }

  async getProfile(username: string, viewer_id?: string) {
    // Tìm user dựa trên username
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

    if (!user) {
      return null; // Nếu không tìm thấy user
    }

    const userObjectId = new ObjectId(user._id);

    // Tính toán số lượng followers
    const followerCountPromise = databaseService.followers.countDocuments({
      followed_user_id: userObjectId
    });

    // Tính toán số lượng followings
    const followingCountPromise = databaseService.followers.countDocuments({
      user_id: userObjectId
    });

    // Tính toán số lượng friends (mutual followers)
    const friendsCountPromise = databaseService.followers
      .aggregate([
        {
          $match: {
            user_id: userObjectId
          }
        },
        {
          $lookup: {
            from: 'followers',
            let: { following: '$followed_user_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$followed_user_id', userObjectId] }, { $eq: ['$user_id', '$$following'] }]
                  }
                }
              }
            ],
            as: 'mutualFollow'
          }
        },
        {
          $match: {
            mutualFollow: { $ne: [] }
          }
        },
        {
          $count: 'friendsCount'
        }
      ])
      .toArray();

    // Kiểm tra xem viewer có follow user này không
    let isFollowedPromise = Promise.resolve(false);
    if (viewer_id) {
      isFollowedPromise = databaseService.followers
        .countDocuments({
          user_id: new ObjectId(viewer_id),
          followed_user_id: userObjectId
        })
        .then((count) => count > 0);
    }

    const [followerCount, followingCount, friendsResult, isFollowed] = await Promise.all([
      followerCountPromise,
      followingCountPromise,
      friendsCountPromise,
      isFollowedPromise
    ]);

    const friendsCount = friendsResult.length > 0 ? friendsResult[0].friendsCount : 0;

    return {
      ...user,
      followers: followerCount,
      followings: followingCount,
      friends: friendsCount,
      isFollowed
    };
  }

  async updateMe(user_id: string, payload: UpdateMeRequestBody) {
    const _payload = payload.date_of_birth ? { ...payload, date_of_birth: new Date(payload.date_of_birth) } : payload;
    const user = await databaseService.users.findOneAndUpdate(
      {
        _id: new ObjectId(user_id)
      },
      {
        $set: {
          ...(_payload as UpdateMeRequestBody & { date_of_birth: Date })
        },
        $currentDate: {
          updated_at: true
        }
      },
      {
        returnDocument: 'after',
        projection: {
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    );
    return user;
  }

  async follow(user_id: string, followed_user_id: string) {
    const follower = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    });
    if (follower) {
      return {
        message: USERS_MESSAGES.FOLLOWED
      };
    }
    await databaseService.followers.insertOne(
      new Follower({
        user_id: new ObjectId(user_id),
        followed_user_id: new ObjectId(followed_user_id)
      })
    );
    return {
      message: USERS_MESSAGES.FOLLOW_SUCCESSFULLY
    };
  }

  async getFollowStats(user_id: string) {
    const userObjectId = new ObjectId(user_id);

    const followerCountPromise = databaseService.followers.countDocuments({
      followed_user_id: userObjectId
    });

    const followingCountPromise = databaseService.followers.countDocuments({
      user_id: userObjectId
    });

    const friendsCountPromise = databaseService.followers
      .aggregate([
        {
          $match: {
            user_id: userObjectId
          }
        },
        {
          $lookup: {
            from: 'followers',
            let: { following: '$followed_user_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$followed_user_id', userObjectId] }, { $eq: ['$user_id', '$$following'] }]
                  }
                }
              }
            ],
            as: 'mutualFollow'
          }
        },
        {
          $match: {
            mutualFollow: { $ne: [] }
          }
        },
        {
          $count: 'friendsCount'
        }
      ])
      .toArray();

    const [followerCount, followingCount, friendsResult] = await Promise.all([
      followerCountPromise,
      followingCountPromise,
      friendsCountPromise
    ]);

    const friendsCount = friendsResult.length > 0 ? friendsResult[0].friendsCount : 0;

    return {
      followers: followerCount,
      followings: followingCount,
      friends: friendsCount
    };
  }

  async unfollow(user_id: string, unfollowed_user_id: string) {
    const follower = await databaseService.followers.findOneAndDelete({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(unfollowed_user_id)
    });
    if (follower) {
      return {
        message: USERS_MESSAGES.UNFOLLOW_SUCCESSFULLY
      };
    }
    return {
      message: USERS_MESSAGES.ALREADY_UNFOLLOWED
    };
  }

  async changePassword(user_id: string, password: string) {
    await databaseService.users.updateOne(
      {
        _id: new ObjectId(user_id)
      },
      {
        $set: {
          password: hashPassword(password)
        },
        $currentDate: {
          updated_at: true
        }
      }
    );
    return {
      message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESSFULLY
    };
  }

  async checkFollow(user_id: string, followed_user_id: string) {
    const follower = await databaseService.followers.findOne({
      user_id: new ObjectId(user_id),
      followed_user_id: new ObjectId(followed_user_id)
    });
    return Boolean(follower);
  }

  async checkFriends(first_user_id: string, second_user_id: string) {
    const isMutualFollow = await databaseService.followers.findOne({
      $and: [
        { user_id: new ObjectId(first_user_id), followed_user_id: new ObjectId(second_user_id) },
        { user_id: new ObjectId(second_user_id), followed_user_id: new ObjectId(first_user_id) }
      ]
    });
    return Boolean(isMutualFollow);
  }

  async getUsers(current_user_id: string) {
    // Lấy danh sách users
    const users = await databaseService.users
      .find(
        { _id: { $ne: new ObjectId(current_user_id) } },
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
      )
      .toArray();

    // Lấy conversations của current user
    const conversations = await databaseService.conversations
      .find({
        participants: new ObjectId(current_user_id),
        type: ConversationType.Direct
      })
      .toArray();

    // Map users với conversation_id tương ứng
    const result = users.map((user) => {
      const conversation = conversations.find((conv) =>
        conv.participants.some((participantId) => participantId.toString() === user._id.toString())
      );

      return {
        ...user,
        conversation_id: conversation ? conversation._id : null
      };
    });

    return result;
  }
}

const usersService = new UsersService();
export default usersService;
