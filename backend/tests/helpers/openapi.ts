import fs from 'fs';
import YAML from 'yaml';
import SwaggerParser from '@apidevtools/swagger-parser';
import Ajv2020, { ValidateFunction } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type { Response } from 'supertest';
import { OPENAPI_SPEC_PATH } from '../../src/docs/swagger';

export const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

interface SpecResponse {
  content?: Record<string, { schema?: object }>;
}

export interface SpecOperation {
  security?: Record<string, string[]>[];
  'x-required-role'?: string;
  responses: Record<string, SpecResponse>;
}

type SpecPaths = Record<string, Partial<Record<(typeof HTTP_METHODS)[number], SpecOperation>>>;

/** Synchronous, un-dereferenced read — for generating test cases at collection time. */
export function readSpecPaths(): SpecPaths {
  return YAML.parse(fs.readFileSync(OPENAPI_SPEC_PATH, 'utf8')).paths;
}

/** Every documented operation as "METHOD /template", e.g. "GET /products/{id}". */
export function listSpecOperations(paths: SpecPaths = readSpecPaths()) {
  return Object.entries(paths).flatMap(([template, item]) =>
    HTTP_METHODS.filter((method) => item[method]).map((method) => ({
      key: `${method.toUpperCase()} ${template}`,
      method,
      template,
      operation: item[method]!,
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
export async function createContractChecker() {
  const spec = (await SwaggerParser.dereference(OPENAPI_SPEC_PATH)) as unknown as {
    paths: SpecPaths;
  };

  // OpenAPI 3.1 schemas are JSON Schema 2020-12. strict: false lets Ajv skip
  // OpenAPI-only annotation keywords such as `example`.
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  addFormats(ajv);

  const validators = new Map<string, ValidateFunction>();
  const covered = new Set<string>();

  function check(res: Response, operationKey: string): void {
    const [method, template] = operationKey.split(' ');
    const operation = spec.paths[template]?.[method.toLowerCase() as 'get'];
    if (!operation) {
      throw new Error(`${operationKey} is not documented in docs/openapi.yaml`);
    }

    // Guard against a test labelling a request with the wrong operation.
    const req = (res as unknown as { req: { method: string; path: string } }).req;
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

  function uncoveredOperations(): string[] {
    return listSpecOperations(spec.paths)
      .map((op) => op.key)
      .filter((key) => !covered.has(key));
  }

  return { check, uncoveredOperations };
}
