import { Hono } from 'hono';
import { DbClient } from '../db/client';
import { SentryAuth } from '../sentry/auth';
import { SentryNormalizer } from '../sentry/normalizer';
import { DbProject, Env } from '../types';

export const projectsApp = new Hono<{ Bindings: Env }>();

/**
 * GET /api/projects
 */
projectsApp.get('/', async c => {
  const dbClient = new DbClient(c.env.DB);
  const projects = await dbClient.listProjects();
  const host = c.req.header('host') || 'localhost:8787';
  const protocol = c.req.url.startsWith('https') ? 'https' : 'http';

  const enriched = projects.map(p => ({
    ...p,
    dsn: SentryAuth.generateDsn(p.public_key, host, p.id, protocol),
    phpIntegrationCode: `\\Sentry\\init([\n  'dsn' => '${SentryAuth.generateDsn(p.public_key, host, p.id, protocol)}',\n  'traces_sample_rate' => 1.0,\n  'profiles_sample_rate' => 1.0,\n  'environment' => 'production'\n]);`
  }));

  return c.json({ projects: enriched });
});

/**
 * POST /api/projects
 */
projectsApp.post('/', async c => {
  const body = await c.req.json<{ name?: string; platform?: string }>();
  if (!body.name) {
    return c.json({ error: 'Project name is required' }, 400);
  }

  const dbClient = new DbClient(c.env.DB);
  const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = 'proj_' + SentryNormalizer.generateHexId(12);
  const publicKey = SentryNormalizer.generateHexId(32);
  const secretKey = SentryNormalizer.generateHexId(32);

  const project: DbProject = {
    id,
    name: body.name,
    slug,
    platform: body.platform || 'php',
    public_key: publicKey,
    secret_key: secretKey,
    created_at: Date.now()
  };

  await dbClient.createProject(project);

  const host = c.req.header('host') || 'localhost:8787';
  const protocol = c.req.url.startsWith('https') ? 'https' : 'http';
  const dsn = SentryAuth.generateDsn(publicKey, host, id, protocol);

  return c.json(
    {
      success: true,
      project: {
        ...project,
        dsn,
        phpIntegrationCode: `\\Sentry\\init([\n  'dsn' => '${dsn}',\n  'traces_sample_rate' => 1.0,\n  'environment' => 'production'\n]);`
      }
    },
    201
  );
});

/**
 * GET /api/projects/:id
 */
projectsApp.get('/:id', async c => {
  const id = c.req.param('id');
  const dbClient = new DbClient(c.env.DB);
  const project = await dbClient.getProjectById(id);

  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  const host = c.req.header('host') || 'localhost:8787';
  const protocol = c.req.url.startsWith('https') ? 'https' : 'http';
  const dsn = SentryAuth.generateDsn(project.public_key, host, project.id, protocol);

  return c.json({
    project: {
      ...project,
      dsn,
      phpIntegrationCode: `\\Sentry\\init([\n  'dsn' => '${dsn}',\n  'traces_sample_rate' => 1.0,\n  'environment' => 'production'\n]);`
    }
  });
});

/**
 * DELETE /api/projects/:id
 */
projectsApp.delete('/:id', async c => {
  const id = c.req.param('id');
  const dbClient = new DbClient(c.env.DB);
  const success = await dbClient.deleteProject(id);
  return c.json({ success });
});
