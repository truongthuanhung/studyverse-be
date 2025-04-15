import { CreatePostRequestBody, SharePostRequestBody } from '~/models/requests/Post.requests';
import databaseService from './database.services';
import { ObjectId } from 'mongodb';
import Post from '~/models/schemas/Post.schema';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';
import { InteractionType, PostPrivacy, PostType } from '~/constants/enums';
import usersService from './users.services';
import tagsService from './tags.services';

class PostsService {
  async checkPostExists(post_id: string) {
    const post = await databaseService.posts.findOne({ _id: new ObjectId(post_id) });
    if (!post) {
      throw new ErrorWithStatus({
        message: 'Post not found',
        status: HTTP_STATUS.NOT_FOUND
      });
    }
    return post;
  }

  async createPost(user_id: string, post: CreatePostRequestBody) {
    // Chèn post vào cơ sở dữ liệu
    const result = await databaseService.posts.insertOne(
      new Post({
        content: post.content,
        type: PostType.Post,
        privacy: post.privacy,
        user_id: new ObjectId(user_id),
        parent_id: post.parent_id ? new ObjectId(post.parent_id) : null,
        medias: post.medias,
        tags: post.tags.map((tag) => new ObjectId(tag)),
        mentions: post.mentions.map((mention) => new ObjectId(mention))
      })
    );
    const createdPost = await this.getPostById(user_id, result.insertedId.toString());
    if (post?.tags?.length) {
      post.tags.forEach((tag_id) => {
        tagsService.addUserTagInteraction({ user_id, tag_id: tag_id.toString(), type: InteractionType.Post });
      });
    }
    return createdPost;
  }

  async getPostById(user_id: string, post_id: string) {
    const [result] = await databaseService.posts
      .aggregate([
        {
          $match: {
            _id: new ObjectId(post_id)
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  name: 1,
                  username: 1,
                  avatar: 1
                }
              }
            ],
            as: 'user'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'mentions',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  name: 1,
                  username: 1,
                  avatar: 1
                }
              }
            ],
            as: 'mentioned_users'
          }
        },
        // Only lookup for checking if user liked the post
        {
          $lookup: {
            from: 'likes',
            let: { post_id: '$_id' },
            pipeline: [
              {
                $match: {
                  $and: [{ $expr: { $eq: ['$target_id', '$$post_id'] } }, { user_id: new ObjectId(user_id) }]
                }
              }
            ],
            as: 'user_likes'
          }
        },
        // Lookup tag details
        {
          $lookup: {
            from: 'tags',
            localField: 'tags',
            foreignField: '_id',
            as: 'tags'
          }
        },
        // Add lookup for parent post when parent_id is not null
        {
          $lookup: {
            from: 'posts',
            let: { parent_id: '$parent_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$_id', '$$parent_id'] }
                }
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'user_id',
                  foreignField: '_id',
                  pipeline: [
                    {
                      $project: {
                        _id: 1,
                        name: 1,
                        username: 1,
                        avatar: 1
                      }
                    }
                  ],
                  as: 'user'
                }
              },
              {
                $project: {
                  _id: 1,
                  content: 1,
                  type: 1,
                  privacy: 1,
                  medias: 1,
                  created_at: 1,
                  user_info: {
                    $let: {
                      vars: { user: { $arrayElemAt: ['$user', 0] } },
                      in: {
                        user_id: '$$user._id',
                        name: '$$user.name',
                        username: '$$user.username',
                        avatar: '$$user.avatar'
                      }
                    }
                  }
                }
              }
            ],
            as: 'parent_post'
          }
        },
        {
          $project: {
            _id: 1,
            content: 1,
            type: 1,
            privacy: 1,
            parent_id: 1,
            tags: 1,
            medias: 1,
            user_views: 1,
            created_at: 1,
            updated_at: 1,
            user_info: {
              $let: {
                vars: { user: { $arrayElemAt: ['$user', 0] } },
                in: {
                  user_id: '$$user._id',
                  name: '$$user.name',
                  username: '$$user.username',
                  avatar: '$$user.avatar'
                }
              }
            },
            mentions: {
              $map: {
                input: '$mentioned_users',
                as: 'mentioned_user',
                in: {
                  user_id: '$$mentioned_user._id',
                  name: '$$mentioned_user.name',
                  username: '$$mentioned_user.username',
                  avatar: '$$mentioned_user.avatar'
                }
              }
            },
            // Include parent_post information if it exists
            parent_post: {
              $cond: {
                if: { $gt: [{ $size: '$parent_post' }, 0] },
                then: { $arrayElemAt: ['$parent_post', 0] },
                else: null
              }
            },
            like_count: 1, // Use existing field
            comment_count: 1, // Use existing field
            isLiked: { $gt: [{ $size: '$user_likes' }, 0] }
          }
        }
      ])
      .toArray();

    if (!result) {
      return null;
    }

    return result;
  }

  async sharePost({ user_id, parent_id, post }: { user_id: string; parent_id: string; post: SharePostRequestBody }) {
    const [result, parent_post] = await Promise.all([
      databaseService.posts.insertOne(
        new Post({
          content: post.content,
          type: PostType.SharePost,
          privacy: post.privacy,
          user_id: new ObjectId(user_id),
          parent_id: new ObjectId(parent_id),
          mentions: (post.mentions || []).map((mention) => new ObjectId(mention))
        })
      ),
      databaseService.posts.findOne({
        _id: new ObjectId(parent_id)
      })
    ]);

    if (!parent_post) {
      throw new ErrorWithStatus({
        message: 'Parent post not found',
        status: HTTP_STATUS.NOT_FOUND
      });
    }
    if (parent_post?.tags?.length) {
      parent_post.tags.forEach((tag_id) => {
        tagsService.addUserTagInteraction({ user_id, tag_id: tag_id.toString(), type: InteractionType.Post });
      });
    }
    const sharedPost = await this.getPostById(user_id, result.insertedId.toString());
    return sharedPost;
  }

  async getMyPosts({ user_id, limit, page }: { user_id: string; limit: number; page: number }) {
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(limit, 100));
    const skip = (page - 1) * limit;

    const [result] = await databaseService.posts
      .aggregate([
        {
          $match: {
            user_id: new ObjectId(user_id)
          }
        },
        {
          $facet: {
            posts: [
              {
                $sort: {
                  created_at: -1
                }
              },
              {
                $skip: skip
              },
              {
                $limit: limit
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'user_id',
                  foreignField: '_id',
                  pipeline: [
                    {
                      $project: {
                        _id: 1,
                        name: 1,
                        username: 1,
                        avatar: 1
                      }
                    }
                  ],
                  as: 'user'
                }
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'mentions',
                  foreignField: '_id',
                  pipeline: [
                    {
                      $project: {
                        _id: 1,
                        name: 1,
                        username: 1,
                        avatar: 1
                      }
                    }
                  ],
                  as: 'mentioned_users'
                }
              },
              // Only lookup for checking if user liked the post
              {
                $lookup: {
                  from: 'likes',
                  let: { post_id: '$_id' },
                  pipeline: [
                    {
                      $match: {
                        $and: [{ $expr: { $eq: ['$target_id', '$$post_id'] } }, { user_id: new ObjectId(user_id) }]
                      }
                    }
                  ],
                  as: 'user_likes'
                }
              },
              // Lookup tag details
              {
                $lookup: {
                  from: 'tags',
                  localField: 'tags',
                  foreignField: '_id',
                  as: 'tags'
                }
              },
              // Add lookup for parent post when parent_id is not null
              {
                $lookup: {
                  from: 'posts',
                  let: { parent_id: '$parent_id' },
                  pipeline: [
                    {
                      $match: {
                        $expr: { $eq: ['$_id', '$$parent_id'] }
                      }
                    },
                    {
                      $lookup: {
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        pipeline: [
                          {
                            $project: {
                              _id: 1,
                              name: 1,
                              username: 1,
                              avatar: 1
                            }
                          }
                        ],
                        as: 'user'
                      }
                    },
                    {
                      $project: {
                        _id: 1,
                        content: 1,
                        type: 1,
                        privacy: 1,
                        medias: 1,
                        created_at: 1,
                        user_info: {
                          $let: {
                            vars: { user: { $arrayElemAt: ['$user', 0] } },
                            in: {
                              user_id: '$$user._id',
                              name: '$$user.name',
                              username: '$$user.username',
                              avatar: '$$user.avatar'
                            }
                          }
                        }
                      }
                    }
                  ],
                  as: 'parent_post'
                }
              },
              {
                $project: {
                  _id: 1,
                  content: 1,
                  type: 1,
                  privacy: 1,
                  parent_id: 1,
                  tags: 1,
                  medias: 1,
                  user_views: 1,
                  created_at: 1,
                  updated_at: 1,
                  user_info: {
                    $let: {
                      vars: { user: { $arrayElemAt: ['$user', 0] } },
                      in: {
                        user_id: '$$user._id',
                        name: '$$user.name',
                        username: '$$user.username',
                        avatar: '$$user.avatar'
                      }
                    }
                  },
                  mentions: {
                    $map: {
                      input: '$mentioned_users',
                      as: 'mentioned_user',
                      in: {
                        user_id: '$$mentioned_user._id',
                        name: '$$mentioned_user.name',
                        username: '$$mentioned_user.username',
                        avatar: '$$mentioned_user.avatar'
                      }
                    }
                  },
                  // Include parent_post information if it exists
                  parent_post: {
                    $cond: {
                      if: { $gt: [{ $size: '$parent_post' }, 0] },
                      then: { $arrayElemAt: ['$parent_post', 0] },
                      else: null
                    }
                  },
                  like_count: 1, // Use existing field
                  comment_count: 1, // Use existing field
                  isLiked: { $gt: [{ $size: '$user_likes' }, 0] }
                }
              }
            ],
            total: [{ $count: 'count' }]
          }
        }
      ])
      .toArray();

    const posts = result.posts || [];
    const total = result.total.length > 0 ? result.total[0].count : 0;
    const total_pages = Math.ceil(total / limit);

    return {
      posts,
      total,
      page,
      limit,
      total_pages
    };
  }

  async getPostsByUserId({
    user_id,
    limit,
    page,
    viewer_id
  }: {
    user_id: string;
    limit: number;
    page: number;
    viewer_id: string;
  }) {
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(limit, 100));
    const skip = (page - 1) * limit;

    const userObjectId = new ObjectId(user_id);
    const viewerObjectId = new ObjectId(viewer_id);

    // Check friendship status if needed for privacy checks
    const isFriend = await usersService.checkFriends(viewer_id, user_id);
    const isFollower = await usersService.checkFollow(viewer_id, user_id);

    // Build privacy filter
    const privacyFilter = {
      $or: [
        { privacy: PostPrivacy.Public },
        {
          $and: [{ privacy: PostPrivacy.Private }, { user_id: userObjectId }, { user_id: viewerObjectId }]
        },
        {
          $and: [
            { privacy: PostPrivacy.Friends },
            {
              $or: [{ user_id: viewerObjectId }, { $expr: { $eq: [true, isFriend] } }]
            }
          ]
        },
        {
          $and: [
            { privacy: PostPrivacy.Follower },
            {
              $or: [{ user_id: viewerObjectId }, { $expr: { $eq: [true, isFollower] } }]
            }
          ]
        }
      ]
    };

    const [result] = await databaseService.posts
      .aggregate([
        {
          $match: {
            user_id: userObjectId
          }
        },
        {
          // Privacy filter
          $match: privacyFilter
        },
        {
          $facet: {
            posts: [
              {
                $sort: {
                  created_at: -1
                }
              },
              {
                $skip: skip
              },
              {
                $limit: limit
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'user_id',
                  foreignField: '_id',
                  pipeline: [
                    {
                      $project: {
                        _id: 1,
                        name: 1,
                        username: 1,
                        avatar: 1
                      }
                    }
                  ],
                  as: 'user'
                }
              },
              {
                $lookup: {
                  from: 'users',
                  localField: 'mentions',
                  foreignField: '_id',
                  pipeline: [
                    {
                      $project: {
                        _id: 1,
                        name: 1,
                        username: 1,
                        avatar: 1
                      }
                    }
                  ],
                  as: 'mentioned_users'
                }
              },
              // Only lookup for checking if viewer liked the post
              {
                $lookup: {
                  from: 'likes',
                  let: { post_id: '$_id' },
                  pipeline: [
                    {
                      $match: {
                        $and: [{ $expr: { $eq: ['$target_id', '$$post_id'] } }, { user_id: viewerObjectId }]
                      }
                    }
                  ],
                  as: 'viewer_likes'
                }
              },
              // Lookup tag details
              {
                $lookup: {
                  from: 'tags',
                  localField: 'tags',
                  foreignField: '_id',
                  as: 'tags'
                }
              },
              // Add lookup for parent post when parent_id is not null
              {
                $lookup: {
                  from: 'posts',
                  let: { parent_id: '$parent_id' },
                  pipeline: [
                    {
                      $match: {
                        $expr: { $eq: ['$_id', '$$parent_id'] }
                      }
                    },
                    {
                      $lookup: {
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        pipeline: [
                          {
                            $project: {
                              _id: 1,
                              name: 1,
                              username: 1,
                              avatar: 1
                            }
                          }
                        ],
                        as: 'user'
                      }
                    },
                    {
                      $project: {
                        _id: 1,
                        content: 1,
                        type: 1,
                        privacy: 1,
                        medias: 1,
                        created_at: 1,
                        user_info: {
                          $let: {
                            vars: { user: { $arrayElemAt: ['$user', 0] } },
                            in: {
                              user_id: '$$user._id',
                              name: '$$user.name',
                              username: '$$user.username',
                              avatar: '$$user.avatar'
                            }
                          }
                        }
                      }
                    }
                  ],
                  as: 'parent_post'
                }
              },
              {
                $project: {
                  _id: 1,
                  content: 1,
                  type: 1,
                  privacy: 1,
                  parent_id: 1,
                  tags: 1,
                  medias: 1,
                  user_views: 1,
                  created_at: 1,
                  updated_at: 1,
                  user_info: {
                    $let: {
                      vars: { user: { $arrayElemAt: ['$user', 0] } },
                      in: {
                        user_id: '$$user._id',
                        name: '$$user.name',
                        username: '$$user.username',
                        avatar: '$$user.avatar'
                      }
                    }
                  },
                  mentions: {
                    $map: {
                      input: '$mentioned_users',
                      as: 'mentioned_user',
                      in: {
                        user_id: '$$mentioned_user._id',
                        name: '$$mentioned_user.name',
                        username: '$$mentioned_user.username',
                        avatar: '$$mentioned_user.avatar'
                      }
                    }
                  },
                  // Include parent_post information if it exists
                  parent_post: {
                    $cond: {
                      if: { $gt: [{ $size: '$parent_post' }, 0] },
                      then: { $arrayElemAt: ['$parent_post', 0] },
                      else: null
                    }
                  },
                  like_count: 1, // Use existing field
                  comment_count: 1, // Use existing field
                  isLiked: { $gt: [{ $size: '$viewer_likes' }, 0] }
                }
              }
            ],
            total: [
              {
                $match: privacyFilter
              },
              { $count: 'count' }
            ]
          }
        }
      ])
      .toArray();

    const posts = result.posts || [];
    const total = result.total.length > 0 ? result.total[0].count : 0;
    const total_pages = Math.ceil(total / limit);

    return {
      posts,
      total,
      page,
      limit,
      total_pages
    };
  }

  private buildPostLookups(user_id: ObjectId) {
    return [
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                username: 1,
                avatar: 1
              }
            }
          ],
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'mentions',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                username: 1,
                avatar: 1
              }
            }
          ],
          as: 'mentioned_users'
        }
      },
      {
        $lookup: {
          from: 'likes',
          let: { post_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$target_id', '$$post_id'] }, { $eq: ['$user_id', user_id] }]
                }
              }
            }
          ],
          as: 'user_likes'
        }
      },
      {
        $lookup: {
          from: 'tags',
          localField: 'tags',
          foreignField: '_id',
          as: 'tags'
        }
      },
      {
        $lookup: {
          from: 'posts',
          let: { parent_id: '$parent_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$parent_id'] }
              }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'user_id',
                foreignField: '_id',
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                      username: 1,
                      avatar: 1
                    }
                  }
                ],
                as: 'user'
              }
            },
            {
              $project: {
                _id: 1,
                content: 1,
                type: 1,
                privacy: 1,
                medias: 1,
                created_at: 1,
                user_info: {
                  $let: {
                    vars: { user: { $arrayElemAt: ['$user', 0] } },
                    in: {
                      user_id: '$$user._id',
                      name: '$$user.name',
                      username: '$$user.username',
                      avatar: '$$user.avatar'
                    }
                  }
                }
              }
            }
          ],
          as: 'parent_post'
        }
      },
      {
        $project: {
          _id: 1,
          content: 1,
          type: 1,
          privacy: 1,
          parent_id: 1,
          tags: 1,
          medias: 1,
          user_views: 1,
          created_at: 1,
          updated_at: 1,
          user_info: {
            $let: {
              vars: { user: { $arrayElemAt: ['$user', 0] } },
              in: {
                user_id: '$$user._id',
                name: '$$user.name',
                username: '$$user.username',
                avatar: '$$user.avatar'
              }
            }
          },
          mentions: {
            $map: {
              input: '$mentioned_users',
              as: 'mentioned_user',
              in: {
                user_id: '$$mentioned_user._id',
                name: '$$mentioned_user.name',
                username: '$$mentioned_user.username',
                avatar: '$$mentioned_user.avatar'
              }
            }
          },
          parent_post: {
            $cond: {
              if: { $gt: [{ $size: '$parent_post' }, 0] },
              then: { $arrayElemAt: ['$parent_post', 0] },
              else: null
            }
          },
          like_count: 1,
          comment_count: 1,
          isLiked: { $gt: [{ $size: '$user_likes' }, 0] }
        }
      }
    ];
  }

  async getNewsFeed({ user_id, limit, page }: { user_id: string; limit: number; page: number }) {
    // Chuẩn hóa input
    page = Math.max(1, page);
    limit = Math.max(1, Math.min(limit, 100));
    const skip = (page - 1) * limit;
    const objectUserId = new ObjectId(user_id);

    // Tỷ lệ phân phối
    const FOLLOWED_POST_RATIO = 0.7; // 50% từ followed users
    const TAG_POST_RATIO = 0.2; // 30% từ top tags
    const TRENDING_POST_RATIO = 0.1; // 20% từ trending
    const followedLimit = Math.round(limit * FOLLOWED_POST_RATIO);
    const tagLimit = Math.round(limit * TAG_POST_RATIO);
    const trendingLimit = limit - followedLimit - tagLimit;

    // Lấy dữ liệu song song
    const [followDocs, topTagDocs] = await Promise.all([
      databaseService.followers.find({ user_id: objectUserId }, { projection: { followed_user_id: 1 } }).toArray(),
      databaseService.user_tag_interactions
        .aggregate([
          { $match: { user_id: objectUserId } },
          { $sort: { interaction_count: -1 } },
          { $limit: 5 },
          { $project: { tag_id: 1 } }
        ])
        .toArray()
    ]);

    const followedUserIds = followDocs.map((doc) => doc.followed_user_id);
    followedUserIds.push(objectUserId);
    const topTagIds = topTagDocs.map((doc) => doc.tag_id);

    // Thời gian cho trending posts (24h gần nhất)
    const trendingThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Pipeline cho từng loại bài viết
    const followedPipeline = [
      { $match: { user_id: { $in: followedUserIds } } },
      { $sort: { created_at: -1 } },
      { $skip: skip },
      { $limit: followedLimit },
      ...this.buildPostLookups(objectUserId)
    ];

    const tagPipeline = [
      {
        $match: {
          $and: [{ tags: { $in: topTagIds } }, { user_id: { $nin: followedUserIds } }]
        }
      },
      { $sort: { created_at: -1 } },
      { $skip: skip },
      { $limit: tagLimit },
      ...this.buildPostLookups(objectUserId)
    ];

    const trendingPipeline = [
      {
        $match: {
          created_at: { $gte: trendingThreshold },
          user_id: { $nin: followedUserIds } // Tránh trùng với followed posts
        }
      },
      {
        $project: {
          engagement_score: { $add: ['$like_count', { $multiply: ['$comment_count', 2] }] },
          doc: '$$ROOT'
        }
      },
      { $sort: { engagement_score: -1 } },
      { $skip: skip },
      { $limit: trendingLimit },
      { $replaceRoot: { newRoot: '$doc' } },
      ...this.buildPostLookups(objectUserId)
    ];

    // Thực thi song song và đếm tổng
    const [followedPosts, tagPosts, trendingPosts, totalCount] = await Promise.all([
      databaseService.posts.aggregate(followedPipeline).toArray(),
      databaseService.posts.aggregate(tagPipeline).toArray(),
      databaseService.posts.aggregate(trendingPipeline).toArray(),
      databaseService.posts.countDocuments({
        $or: [
          { user_id: { $in: followedUserIds } },
          { $and: [{ tags: { $in: topTagIds } }, { user_id: { $nin: followedUserIds } }] },
          { created_at: { $gte: trendingThreshold } }
        ]
      })
    ]);

    // Kết hợp kết quả
    const posts = [...followedPosts, ...tagPosts, ...trendingPosts].sort((a, b) => b.created_at - a.created_at); // Sắp xếp lại theo thời gian

    const total_pages = Math.ceil(totalCount / limit);

    return {
      posts,
      total: totalCount,
      page,
      limit,
      total_pages
    };
  }
}

const postsService = new PostsService();
export default postsService;
