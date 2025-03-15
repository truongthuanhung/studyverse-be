import axios from 'axios';
import databaseService from './database.services';
import Tag from '~/models/schemas/Tag.schema';
import { ObjectId } from 'mongodb';
import { ErrorWithStatus } from '~/models/Errors';
import HTTP_STATUS from '~/constants/httpStatus';

class TagsService {
  async fetchTagsFromWikidata() {
    const sparqlQuery = `
      SELECT ?tag ?tagLabel WHERE {
        ?tag wdt:P31 wd:Q11862829.
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      } LIMIT 5000
    `;

    const url = 'https://query.wikidata.org/sparql';

    try {
      const response = await axios.get(url, {
        params: { query: sparqlQuery, format: 'json' },
        headers: { 'User-Agent': 'StudyVerse/1.0' }
      });

      const results = response.data.results.bindings;
      return results.map((item: any) => ({
        name: item.tagLabel.value
      }));
    } catch (error) {
      console.error('Error fetching tags from Wikidata:', error);
      return [];
    }
  }

  async saveTagsToDatabase() {
    const tags = await this.fetchTagsFromWikidata();

    if (!tags.length) {
      console.log('No tags found.');
      return;
    }

    const bulkOperations = tags.map((tag: Tag) => ({
      updateOne: {
        filter: { name: tag.name },
        update: { $setOnInsert: new Tag(tag) },
        upsert: true
      }
    }));

    try {
      const result = await databaseService.tags.bulkWrite(bulkOperations);
      console.log('Tags saved successfully:', result.upsertedCount, 'new tags added.');
    } catch (error) {
      console.error('Error saving tags to database:', error);
    }
  }

  async getTagByName(name: string) {
    const tag = await databaseService.tags.findOne({
      name
    });
    return tag;
  }

  async getTagById(tag_id: string) {
    const tag = await databaseService.tags.findOne({
      _id: new ObjectId(tag_id)
    });
    if (!tag) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: 'Tag not found'
      });
    }
    return tag;
  }

  async getTagInGroup(tag_id: string, group_id: string) {
    const tag = await databaseService.tags.findOne({
      _id: new ObjectId(tag_id)
    });

    if (!tag) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: 'Tag not found in group'
      });
    }

    const questionCount = await databaseService.questions.countDocuments({
      tags: { $in: [new ObjectId(tag_id)] },
      group_id: new ObjectId(group_id)
    });

    return {
      ...tag,
      question_count: questionCount
    };
  }

  async searchTagsByGroup(group_id: string, searchQuery: string) {
    if (!searchQuery) {
      searchQuery = '';
    }
    const searchRegex = new RegExp(searchQuery, 'i');
    const groupObjectId = new ObjectId(group_id);

    const results = await databaseService.tags
      .aggregate([
        {
          $match: { name: searchRegex }
        },
        {
          $lookup: {
            from: 'group_tags',
            let: { tagId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$tag_id', '$$tagId'] }, { $eq: ['$group_id', groupObjectId] }]
                  }
                }
              }
            ],
            as: 'groupTagData'
          }
        },
        {
          $addFields: {
            usage_count: { $ifNull: [{ $arrayElemAt: ['$groupTagData.usage_count', 0] }, 0] }
          }
        },
        { $sort: { usage_count: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 1,
            name: 1,
            usage_count: 1,
            created_at: 1,
            updated_at: 1
          }
        }
      ])
      .toArray();

    return results;
  }
}

const tagsService = new TagsService();

export default tagsService;
