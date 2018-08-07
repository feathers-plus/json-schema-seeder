
const debug = require('debug')('json-schema-seeder');

const casual = require('casual');
const Chance = require('chance');
const faker = require('faker');
const jsf = require('json-schema-faker');
const seederForeignKeys = require('seeder-foreign-keys');
const { inspect } = require('util');

module.exports = function (options1 = {}) {
  // Custom json-schema-faker options
  jsf.option(options1.schema || {});

  // Custom json-schema-faker formats
  /*
  jsf.format('fk', inputSchema => {
    return `->${JSON.stringify(inputSchema)}`;
  });
  */

  /*
   Configure faker
   {
     locale: 'en',          // Language to generate for
     localeFallback: 'en',  // Use the default localeFallback for missing definitions
     seed: 123,             // Reset random generator for reproducible results
   }
   */
  jsf.extend('faker', () => {
    const fakerOptions = options1.faker || {};

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
   Configure chance
   {
     seed: 123,             // Reset random generator for reproducible results
     seed: Math.random,     // Use JS random number generator instead of chance's Mersenne Twister.
   }
   */
  jsf.extend('chance', function(){
    const chanceOptions = options1.chance || {};
    const chance = new Chance(chanceOptions.seed);

    Object.keys(chanceOptions).forEach(prop => {
      if (prop !== 'seed') {
        chance.mixin({ [prop]: chanceOptions[prop] });
      }
    });

    return chance;
  });

  /*
   Configure casual
   */

  // Return seeder
  return seeder;

  function seeder (jsonSchemas, options = {}) {
    const schemas = {};

    Object.keys(jsonSchemas).forEach(tableName => {
      debug('tableName', tableName);

      // Normalize JSON-schema for jsf. faker.fk and faker.exp must be type: 'string'
      const schema = clone(jsonSchemas[tableName]);
      traverseJsonSchema(schema, normalizeForJsf);

      schemas[tableName] = {
        type: 'array',
        maxItems: jsonSchemas[tableName].fakeItems || 5,
        items: schema,
      };
    });

    // Seed data
    const data = jsf(schemas, options);

    // Handle foreign keys and expressions
    seederForeignKeys(data, options);
    return data;
  }

  function normalizeForJsf(fieldSchema, fieldName) {
    if (
      typeof fieldSchema.faker === 'object' && fieldSchema.faker !== null &&
      (fieldSchema.faker.fk || fieldSchema.faker.exp)
    ) {
      fieldSchema.type = 'string';
      debug('convert to "string"', fieldName);
    }
  }
};

function traverseJsonSchema(schema = {}, cb) {
  const properties = schema.properties || {};

  Object.keys(properties).forEach(fieldName => {
    const fieldSchema = properties[fieldName];
    cb(fieldSchema, fieldName);

    if (fieldSchema.type === 'object') {
      traverseJsonSchema(fieldSchema.properties, cb);
    }

    if (fieldSchema.type === 'array') {
      traverseJsonSchema(fieldSchema.items, cb);
    }
  });
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function inspector(desc, obj) {
  if (desc) console.log(desc);
  console.log(inspect(obj, { colors: true, depth: 5 }));
}
