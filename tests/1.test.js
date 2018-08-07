
const { assert } = require('chai');
const { inspect } = require('util');
const jsonSchemaSeeder = require('../lib');

// Needed by custom seeders
const faker = require('faker');
const Chance = require('chance');
const chance = new Chance();

/*
const jsonSchemas = {
  bookmarksSchema : {
    "type": "object",
    "properties": {
      "bookmarks": {
        "type": "array",
        "minItems": 3,
        "maxItems": 5,
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "number",
              "unique": true,
              "minimum": 1
            },
            "url": {
              "type": "string",
              "faker": "internet.url"
            },
            "title": {
              "type": "string"
            },
            "tags": {
              "type": "string",
              "faker":"custom.tags"
            },
            "usersId": {
              "type": "string",
              "faker": { 'fk': 'users:random' }
            },
            "createdAt": {
              "type": "integer",
              "faker": { 'exp': 'new Date.now()' }
            }
          },
          "required": ["id", "url", "title", "tags"]
        }
      }
    },
    "required": ["bookmarks"]
  }
};
*/
const jsonSchemas1 = {
  bookmarks: {
    "properties": {
      "id": {
        "type": "number",
        "unique": true,
        "minimum": 1
      },
      "url": {
        "type": "string",
        "faker": "internet.url"
      },
      "title": {
        "type": "string"
      },
      "tags": {
        "type": "string",
        "faker":"custom.tags"
      },
      "usersId": {
        "type": "string",
        "faker": { 'fk': 'bookmarks:random' }
      },
      "createdAt": {
        "type": "integer",
        "faker": { 'exp': 'Date.now()' }
      }
    },
    "required": ["id", "url", "title", "tags"]
  }
};

const jsonSchemas2 = {
  posts: {
    fakeItems: 3,
    properties: {
      sentence3: {
        type: 'string',
        chance: { sentence: [{ words: 3 }]},
      },
      user: {
        type: 'object',
        chance: 'user',
      },
      password: {
        type: 'string',
        chance: { hash: [{ length: 60 }] },
      },
    },
  },
};

const jsonSchemas3 = {
  users: {
    fakeItems: 3,
    properties: {
      id: {
        type: 'integer',
        unique: true,
        minimum: 1
      },
      name: {
        type: 'string',
        faker: { fake: '{{name.lastName}}, {{name.firstName}}' }
      }
    },
  },
  posts: {
    fakeItems: 4,
    properties: {
      id: {
        type: 'integer',
        unique: true,
        minimum: 10
      },
      title: {
        type: 'string',
        faker: 'lorem.sentence',
        maxLength: 25,
      },
      userId: {
        type: 'integer',
        faker: { 'fk': 'users:random' }
      },
      createdAt: {
        type: 'integer',
        faker: { 'exp': 'Date.now()' }
      },
    },
  }
};

const jssOptions = {
  schema: {
    alwaysFakeOptionals: true, // Populate optionals
    resolveJsonPath: true,     // See https://github.com/dchester/jsonpath
  },
  faker: {
    locale: 'en',              // Language
    localeFallback: 'en',      // Language for missing fakers
    // Custom seeders
    custom: {
      tags: () => `${faker.lorem.word()}, ${faker.lorem.word()}, ${faker.lorem.word()}`,
    },
    fk: str =>  `->${str}`,
    exp: str => `=>${str}`,
  },
  chance: {
    // Custom seeders
    user: () => ({
      // This instance of 'chance' does not have the same seed as json-schema-seeder's instance.
      first: chance.first(),
      last: chance.last(),
      email: chance.email()
    })
  },
};

describe('1.test.js - xxx', () => {
  it('test faker', () => {
    const seeder = jsonSchemaSeeder(jssOptions);

    const data = seeder(jsonSchemas1);

    assert.deepEqual(Object.keys(data), ['bookmarks'], 'bookmarks');
    assert.lengthOf(data.bookmarks, 5, 'length');

    data.bookmarks.forEach(row => {
      assert.deepEqual(Object.keys(row), ['id', 'url', 'title', 'tags', 'usersId', 'createdAt'], 'fields');
    });
  });

  it('test chance', () => {
    const seeder = jsonSchemaSeeder(jssOptions);

    const data = seeder(jsonSchemas2);

    assert.deepEqual(Object.keys(data), ['posts'], 'posts');
    assert.lengthOf(data.posts, 3, 'length');

    data.posts.forEach(row => {
      assert.deepEqual(Object.keys(row), ['sentence3', 'user', 'password'], 'fields');
    });
  });

  it('multiple schemas', () => {
    const seeder = jsonSchemaSeeder(jssOptions);

    const startTime = Date.now();
    const data = seeder(jsonSchemas3);
    const endTime = Date.now();
    const keys = data.users.map(user => user.id);

    assert.deepEqual(Object.keys(data), ['users', 'posts'], 'services');
    assert.lengthOf(data.users, 3, 'length users');
    assert.lengthOf(data.posts, 4, 'length posts');

    data.users.forEach(row => {
      assert.deepEqual(Object.keys(row), ['id', 'name'], 'fields users');
    });

    data.posts.forEach(row => {
      assert.deepEqual(Object.keys(row), ['id', 'title', 'userId', 'createdAt'], 'fields posts');
      assert.include(keys, row.userId, 'userId posts');
      assert.isAtLeast(row.createdAt, startTime, 'createdAt start posts');
      assert.isAtMost(row.createdAt, endTime, 'createdAt end posts');
    });
  });
});

function inspector(desc, obj) {
  if (desc) console.log(desc);
  console.log(inspect(obj, { colors: true, depth: 5 }));
}
