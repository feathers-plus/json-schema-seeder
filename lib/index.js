
const debug = require('debug')('json-schema-seeder');

const Chance = require('chance');
const faker = require('faker');
const jsf = require('json-schema-faker');
const seederForeignKeys = require('seeder-foreign-keys');
const traverse = require('traverse');
const { inspect } = require('util');
const { ObjectId } = require('mongodb');

const defaultAdapter = 'mongodb';
const adaptersInfo = {
  mongodb: {
    idName: '_id',
    idType: 'string',
    faker: () => 'key.objectId'
  },
  mongoose: {
    idName: '_id',
    idType: 'string',
    faker: () => 'key.objectId'
  },
  nedb: {
    idName: '_id',
    idType: 'string',
    faker: tableName => ({ [`key.nedb`]: [tableName] })
  },
  sequelize: {
    idName: 'id',
    idType: 'integer',
    faker: tableName => ({ [`key.integer`]: [tableName] })
  },
  knex: {
    idName: 'id',
    idType: 'integer',
    faker: tableName => ({ [`key.integer`]: [tableName] })
  },
  rethinkdb: {
    idName: 'id',
    idType: 'integer',
    faker: tableName => ({ [`key.integer`]: [tableName] })
  },
  memory: {
    idName: 'id',
    idType: 'integer',
    faker: tableName => ({ [`key.integer`]: [tableName] })
  }
};

let tableCounters; // keeps last used integer key for each schema

/*
 options1 = {
   testNoKeyConvert: false,       // Do not process key fields. Used in testing.
   defaultFakeRecords: 5,         // #records to generate if no fakeRecords property.
   jsf: { ... },                  // Configuration for json-schema-faker.
   faker: { ... },                // Configuration for faker.
   chance: { ... },               // Configuration for chance.
 };
 */
module.exports = function (options1 = {}) {
  /*
   Configure json-schema-faker.
   See https://github.com/json-schema-faker/json-schema-faker#custom-options
   */
  if (options1.jsf) {
    jsf.option(Object.assign({}, options1.jsf, { extend: undefined }));

    Object.keys(options1.jsf.extend || {}).forEach(name => {
      jsf.extend(name, options1.jsf.extend[name]);
    });
  }

  /*
   Configure faker.
   See https://github.com/Marak/Faker.js
   {
     locale: 'en',          // Language to generate for
     localeFallback: 'en',  // Use the default localeFallback for missing definitions
     seed: 123,             // Reset random generator for reproducible results
     // Invoked with: faker: 'faz.foo', faker: { 'faz.foo': 'bar' } or faker: { 'faz.foo': ['bar', 'baz'] }
     foo: (p1 = 'hello', p2 = 'world') => `${p1} ${p2}`,
   }
   */
  jsf.extend('faker', () => {
    const fakerOptions = options1.faker || {};

    // Custom definitions for key generation
    faker.key = {
      objectId: () => ObjectId().toString(),
      integer: name => {
        tableCounters[name] = tableCounters[name] || 0;
        return ++tableCounters[name];
      },
      nedb: name => {
        tableCounters[name] = tableCounters[name] || 0;
        return `00000${++tableCounters[name]}`.substr(-6);
      }
    };

    // Explicit configuration
    Object.keys(fakerOptions).forEach(prop => {
      if (prop === 'seed') {
        faker.seed(fakerOptions.seed);
      } else {
        faker[prop] = fakerOptions[prop];
      }
    });

    return faker;
  });

  /*
   Configure chance.
   See https://chancejs.com/
   {
     seed: 123,             // Reset random generator for reproducible results
     // Invoked with: chance: 'foo', chance: { foo: 'bar' } or chance: { foo: ['bar', 'baz'] }
     foo: (p1 = 'hello', p2 = 'world') => `${p1} ${p2}`,
   }
   */
  jsf.extend('chance', function () {
    const chanceOptions = options1.chance || {};
    const chance = new Chance(chanceOptions.seed);

    Object.keys(chanceOptions).forEach(prop => {
      if (prop !== 'seed') {
        chance.mixin({ [prop]: chanceOptions[prop] });
      }
    });

    return chance;
  });

  // Return configured seeder
  return seeder;

  function seeder (jsonSchemas, adapters = defaultAdapter, options = {}) {
    const schemas = { properties: {} };

    // Convert JSON-schema for jsf.
    Object.keys(jsonSchemas).forEach(tableName => {
      const schema = clone(jsonSchemas[tableName]);
      tableCounters = {}; // reset integer key counters

      // Get adapter used for table
      const adapterName = typeof adapters === 'string'
        ? adapters : (adapters[tableName] || defaultAdapter);
      const adapter = adaptersInfo[adapterName] || adaptersInfo[defaultAdapter];
      debug('tableName', tableName, adapter.idName);

      // Configure the key definition
      if (!options1.testNoKeyConvert) {
        schema.properties = schema.properties || {};

        // Try to keep key prop in original relative position in object
        if (adapter.idName !== 'id') delete schema.properties.id;
        if (adapter.idName !== '_id') delete schema.properties._id;

        // Configure key field
        schema.properties[adapter.idName] = {
          type: adapter.idType,
          faker: adapter.faker(tableName)
        };
      }

      // faker.fk and faker.exp must be type: 'string'
      traverse(schema).forEach(function (node) {
        if (this.key === 'type' && node === 'ID') {
          this.update('string');
          return;
        }

        if (typeof node === 'object' && node !== null && node.faker && node.faker.exp) {
          node.type = 'string';
          this.update(node);
        }
      });

      // Wrap schema in an array
      schemas.properties[tableName] = {
        type: 'array',
        maxItems: jsonSchemas[tableName].fakeRecords || options1.defaultFakeRecords || 5,
        items: schema
      };
    });

    // Seed data
    if (!Object.keys(schemas).length) return {};
    const data = jsf(schemas);

    // Handle foreign keys and expressions
    seederForeignKeys(data, options);
    return data;
  }
};

function clone (obj) {
  return JSON.parse(JSON.stringify(obj));
}

function inspector (desc, obj) { // eslint-disable-line
  if (desc) console.log(desc);
  console.log(inspect(obj, { colors: true, depth: 7 }));
}
