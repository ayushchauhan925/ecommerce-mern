const fs = require('fs');
const YAML = require('yaml');
const SwaggerParser = require('@apidevtools/swagger-parser');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const { OPENAPI_SPEC_PATH } = require('../../src/docs/swagger');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

/** Synchronous, un-dereferenced read — for generating test cases at collection time. */
function readSpecPaths() {
  return YAML.parse(fs.readFileSync(OPENAPI_SPEC_PATH, 'utf8')).paths;
}

/** Every documented operation as "METHOD /template", e.g. "GET /products/{id}". */
function listSpecOperations(paths = readSpecPaths()) {
  return Object.entries(paths).flatMap(([template, item]) =>
    HTTP_METHODS.filter((method) => item[method]).map((method) => ({
      key: `${method.toUpperCase()} ${template}`,
      method,
      template,
      operation: item[method],
    })),
  );
}

/**
 * Validates real HTTP responses against docs/openapi.yaml:
 *  - the status code must be documented for that operation, and
 *  - the JSON body must match the documented schema for that status.
 * It also records which operations were exercised, so a test can assert the
 * whole spec was covered.
 */
async function createContractChecker() {
  const spec = await SwaggerParser.dereference(OPENAPI_SPEC_PATH);

  // OpenAPI 3.1 schemas are JSON Schema 2020-12. strict: false lets Ajv skip
  // OpenAPI-only annotation keywords such as `example`.
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);

  const validators = new Map();
  const covered = new Set();

  function check(res, operationKey) {
    const [method, template] = operationKey.split(' ');
    const operation = spec.paths[template]?.[method.toLowerCase()];
    if (!operation) {
      throw new Error(`${operationKey} is not documented in docs/openapi.yaml`);
    }

    // Guard against a test labelling a request with the wrong operation.
    const req = res.req;
    const actualPath = req.path.split('?')[0].replace(/^\/api/, '');
    const pattern = new RegExp(`^${template.replace(/\{[^}]+\}/g, '[^/]+')}$`);
    if (req.method !== method || !pattern.test(actualPath)) {
      throw new Error(`Labelled ${operationKey} but the request was ${req.method} ${actualPath}`);
    }

    const status = String(res.status);
    const documented = operation.responses[status];
    if (!documented) {
      throw new Error(
        `${operationKey} returned ${status}, which docs/openapi.yaml does not document ` +
          `(documented: ${Object.keys(operation.responses).join(', ')}).\n` +
          `Body: ${JSON.stringify(res.body)}`,
      );
    }

    const schema = documented.content?.['application/json']?.schema;
    if (schema) {
      const cacheKey = `${operationKey} ${status}`;
      let validate = validators.get(cacheKey);
      if (!validate) {
        validate = ajv.compile(schema);
        validators.set(cacheKey, validate);
      }
      if (!validate(res.body)) {
        throw new Error(
          `${operationKey} ${status} response does not match docs/openapi.yaml:\n  ` +
            ajv.errorsText(validate.errors, { separator: '\n  ', dataVar: 'body' }) +
            `\nBody: ${JSON.stringify(res.body, null, 2)}`,
        );
      }
    }

    covered.add(`${method} ${template}`);
  }

  function uncoveredOperations() {
    return listSpecOperations(spec.paths)
      .map((op) => op.key)
      .filter((key) => !covered.has(key));
  }

  return { check, uncoveredOperations };
}

module.exports = { HTTP_METHODS, readSpecPaths, listSpecOperations, createContractChecker };
