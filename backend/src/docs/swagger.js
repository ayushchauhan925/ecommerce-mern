const fs = require('fs');
const path = require('path');
const { Router } = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');

// Resolves to <project root>/docs/openapi.yaml from both src/docs (ts-node)
// and dist/docs (compiled build), so the spec is read from the same file in
// development and production. Deployments must ship the docs/ folder.
const OPENAPI_SPEC_PATH = path.resolve(__dirname, '../../docs/openapi.yaml');

// Parsed once at startup. A broken YAML file fails fast here rather than
// serving a blank docs page.
const openApiSpec = YAML.parse(fs.readFileSync(OPENAPI_SPEC_PATH, 'utf8'));

const docsRouter = Router();

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

module.exports = { OPENAPI_SPEC_PATH, docsRouter };
