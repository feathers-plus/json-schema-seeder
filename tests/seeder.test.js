
const { assert } = require('chai');
const { inspect } = require('util');
const jsonSchemaSeeder = require('../lib');

// Needed by custom seeders
const faker = require('faker');
const Chance = require('chance');
const chance = new Chance();

const jsonSchemas0 = {
  bookmarks: {
    'properties': {
      'id': {
        'type': 'integer',
        'unique': true,
        'minimum': 1
      },
      'url': {
        'type': 'string'
      },
      'title': {
        'type': 'string'
      },
      'tags': {
        'type': 'string'
      },
      userId: {
        type: 'ID'
      },
      'createdAt': {
        'type': 'integer'
      }
    },
    'required': ['id', 'url', 'title', 'tags']
  }
};

const jsonSchemas1 = {
  bookmarks: {
    'properties': {
      'id': {
        'type': 'integer',
        'unique': true,
        'minimum': 1
      },
      'url': {
        'type': 'string',
        'faker': 'internet.url'
      },
      'title': {
        'type': 'string'
      },
      'tags': {
        'type': 'string',
        'faker': 'custom.tags'
      },
      'usersId': {
        'type': 'string',
        'faker': { 'fk': 'bookmarks:random' }
      },
      'createdAt': {
        'type': 'integer',
        'faker': { 'exp': 'Date.now()' }
      }
    },
    'required': ['id', 'url', 'title', 'tags']
  }
};

const jsonSchemas2 = {
  posts: {
    fakeRecords: 3,
    properties: {
      sentence3: {
        type: 'string',
        chance: { sentence: [{ words: 3 }] }
      },
      user: {
        type: 'object',
        chance: 'user'
      },
      password: {
        type: 'string',
        chance: { hash: [{ length: 60 }] }
      }
    }
  }
};

const jsonSchemas3 = {
  users: {
    fakeRecords: 3,
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
    }
  },
  posts: {
    fakeRecords: 4,
    properties: {
      id: {
        type: 'integer',
        unique: true,
        minimum: 1
      },
      title: {
        type: 'string',
        faker: 'lorem.sentence',
        maxLength: 25
      },
      userId: {
        type: 'integer',
        faker: { 'fk': 'users:random' }
      },
      createdAt: {
        type: 'integer',
        faker: { 'exp': 'Date.now()' }
      }
    }
  }
};

const jsonSchemas4 = {
  users: {
    fakeRecords: 3,
    properties: {
      name: {
        type: 'string',
        faker: { fake: '{{name.lastName}}, {{name.firstName}}' }
      }
    }
  },
  posts: {
    fakeRecords: 4,
    properties: {
      title: {
        type: 'string',
        faker: 'lorem.sentence',
        maxLength: 25
      },
      userId: {
        type: 'integer',
        faker: { 'fk': 'users:random' }
      },
      createdAt: {
        type: 'integer',
        faker: { 'exp': 'Date.now()' }
      }
    }
  }
};

const jssOptions = {
  // testNoKeyConvert: true,   // Do not convert keys. Used in tests.
  jsf: {
    alwaysFakeOptionals: true, // Populate optionals
    resolveJsonPath: true // See https://github.com/dchester/jsonpath

  },
  faker: {
    locale: 'en', // Language
    localeFallback: 'en', // Language for missing fakers
    // Custom seeders
    custom: {
      tags: () => `${faker.lorem.word()}, ${faker.lorem.word()}, ${faker.lorem.word()}`
    },
    fk: str => `->${str}`,
    exp: str => `=>${str}`
  },
  chance: {
    // Custom seeders
    user: () => ({
      // This instance of 'chance' would not have the same seed as json-schema-seeder's instance.
      first: chance.first(),
      last: chance.last(),
      email: chance.email()
    })
  }
};

describe('seeder.test.js - xxx', () => {
  it('test schema with no faking', () => {
    jssOptions.testNoKeyConvert = true;
    const seeder = jsonSchemaSeeder(jssOptions);

    const data = seeder(jsonSchemas0);

    assert.deepEqual(Object.keys(data), ['bookmarks'], 'bookmarks');
    assert.lengthOf(data.bookmarks, 5, 'length');

    data.bookmarks.forEach(row => {
      assert.deepEqual(Object.keys(row), ['id', 'url', 'title', 'tags', 'createdAt'], 'fields');
    });
  });

  it('test faker', () => {
    jssOptions.testNoKeyConvert = true;
    const seeder = jsonSchemaSeeder(jssOptions);

    const data = seeder(jsonSchemas1);

    assert.deepEqual(Object.keys(data), ['bookmarks'], 'bookmarks');
    assert.lengthOf(data.bookmarks, 5, 'length');

    data.bookmarks.forEach(row => {
      assert.deepEqual(Object.keys(row), ['id', 'url', 'title', 'tags', 'usersId', 'createdAt'], 'fields');
    });
  });

  it('test chance', () => {
    jssOptions.testNoKeyConvert = true;
    const seeder = jsonSchemaSeeder(jssOptions);

    const data = seeder(jsonSchemas2);

    assert.deepEqual(Object.keys(data), ['posts'], 'posts');
    assert.lengthOf(data.posts, 3, 'length');

    data.posts.forEach(row => {
      assert.deepEqual(Object.keys(row), ['sentence3', 'user', 'password'], 'fields');
    });
  });

  it('test seeder-foreign-keys', () => {
    jssOptions.testNoKeyConvert = true;
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

  it('mongodb & mongoose adapters', () => {
    jssOptions.testNoKeyConvert = false;
    const seeder = jsonSchemaSeeder(jssOptions);

    const data = seeder(jsonSchemas4, 'mongoose');
    const keys = data.users.map(user => user.id || user._id);

    assert.deepEqual(Object.keys(data), ['users', 'posts'], 'services');
    assert.lengthOf(data.users, 3, 'length users');
    assert.lengthOf(data.posts, 4, 'length posts');

    data.users.forEach(row => {
      assert.deepEqual(Object.keys(row), ['name', '_id'], 'fields users');
    });

    data.posts.forEach(row => {
      assert.deepEqual(Object.keys(row), ['title', 'userId', 'createdAt', '_id'], 'fields posts');
      assert.include(keys, row.userId, 'userId posts');
    });
  });

  it('sequelize & knex adapters', () => {
    jssOptions.testNoKeyConvert = false;
    const seeder = jsonSchemaSeeder(jssOptions);

    const data = seeder(jsonSchemas4, {
      users: 'knex',
      posts: 'sequelize'
    });

    const keys = data.users.map(user => user.id || user._id);

    assert.deepEqual(Object.keys(data), ['users', 'posts'], 'services');
    assert.lengthOf(data.users, 3, 'length users');
    assert.lengthOf(data.posts, 4, 'length posts');

    data.users.forEach(row => {
      assert.deepEqual(Object.keys(row), ['name', 'id'], 'fields users');
    });

    data.posts.forEach(row => {
      assert.deepEqual(Object.keys(row), ['title', 'userId', 'createdAt', 'id'], 'fields posts');
      assert.include(keys, row.userId, 'userId posts');
    });
  });
});

function inspector (desc, obj) { // eslint-disable-line
  if (desc) console.log(desc);
  console.log(inspect(obj, { colors: true, depth: 5 }));
}
