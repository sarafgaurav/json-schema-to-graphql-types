const {test} = require('ava');
const convert = require('../src/convert');
const {
  parse, validate, execute, buildSchema, typeFromAST,
  GraphQLSchema, GraphQLObjectType, introspectionQuery
} = require('graphql');


function cannonicalize (introspectionResult) {
  introspectionResult.data.__schema.directives.sort(function (a, b) {
    return a.name < b.name;
  });
  return introspectionResult;
}

async function testConversion (test, jsonSchema, expectedTypeName, expectedType) {
  const convertedType = convert(jsonSchema);
  const queryType = new GraphQLObjectType({
    name: 'Query',
    fields: {
      findOne: {
        type: convertedType
      }
    }
  });

  const schema = new GraphQLSchema({query: queryType});

  const exepectedSchema = buildSchema(`
    ${expectedType}
    type Query {
      findOne: ${expectedTypeName}
    }
  `);

  const introspection = await execute({
    schema,
    document: parse(introspectionQuery)
  });

  const expectedIntrospection = await execute({
    schema: exepectedSchema,
    document: parse(introspectionQuery)
  });
  
  test.deepEqual(cannonicalize(introspection), cannonicalize(expectedIntrospection));

}

test('empty object', async function (test) {
  const emptyType = {
    title: "Empty",
    type: "object",
    properties: { }
  };

  const expectedType = `type Empty {
    _typesWithoutFieldsAreNotAllowed_: String
  }`;

  await testConversion(test, emptyType, 'Empty', expectedType);
});

async function testAttrbuteType (test, jsonType, graphQLType) {
  const simpleType = {
    title: "Simple",
    type: "object",
    properties: { 
      attribute: jsonType
    }
  };

  const expectedType = `type Simple {
    attribute: ${graphQLType}
  }`;

  await testConversion(test, simpleType, 'Simple', expectedType);
}

test('string attributes', async function (test) {
  await testAttrbuteType(test, 'string', 'String');
});

test('integer attributes', async function (test) {
  await testAttrbuteType(test, 'integer', 'Int');
});

test('float attributes', async function (test) {
  await testAttrbuteType(test, 'number', 'Float');
});