import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

// Resolves to <project root>/docs/openapi.yaml from both src/docs (ts-node)
// and dist/docs (compiled build), so the spec is read from the same file in
// development and production. Deployments must ship the docs/ folder.
export const OPENAPI_SPEC_PATH = path.resolve(__dirname, '../../docs/openapi.yaml');

// Parsed once at startup. A broken YAML file fails fast here rather than
// serving a blank docs page.
const openApiSpec = YAML.parse(fs.readFileSync(OPENAPI_SPEC_PATH, 'utf8'));

export const docsRouter = Router();

// Raw spec for tooling (Postman import, client generators, contract tests).
docsRouter.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

docsRouter.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    customSiteTitle: 'E-Commerce API Docs',
    swaggerOptions: {
      persistAuthorization: true, // keep the Bearer token across page reloads
      displayRequestDuration: true,
      tryItOutEnabled: true,
    },
  }),
);
