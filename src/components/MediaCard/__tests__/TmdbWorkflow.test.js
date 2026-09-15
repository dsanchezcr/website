import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { load } from 'js-yaml';

const workflow = load(fs.readFileSync(path.resolve('.github/workflows/tmdb-sync.yml'), 'utf8'));
const command = workflow.jobs.sync.steps[0].run.trim();
const script = command.slice(command.indexOf("'") + 1, command.lastIndexOf("'"));
const result = (completed, continuationToken = null) => ({
  completed, continuationToken, deleted: 0, warnings: [],
});

async function runWorkflow(responses) {
  const requests = [];
  const process = {
    exitCode: 0,
    env: {
      EVENT_NAME: 'workflow_dispatch', INPUT_DRY_RUN: 'true', INPUT_MAX_ITEMS: '250',
      SITE_URL: 'https://example.test', TMDB_SYNC_KEY: 'test-invocation-key',
    },
  };
  await vm.runInNewContext(script, {
    process, URL, AbortSignal, console: { log() {}, error() {} },
    setTimeout: callback => { callback(); return 0; },
    fetch: async (url, options) => {
      requests.push({ url: String(url), body: JSON.parse(options.body) });
      const response = responses.shift();
      if (!response) throw new Error('Unexpected extra request');
      return {
        ok: response.status === 200, status: response.status,
        json: async () => response.body,
      };
    },
  });
  return { requests, exitCode: process.exitCode };
}

describe('TMDB workflow continuation', () => {
  it('follows partial responses with the same preview/options until complete', async () => {
    const run = await runWorkflow([
      { status: 200, body: result(false, 'next-batch') },
      { status: 200, body: result(true) },
    ]);
    expect(run.exitCode).toBe(0);
    expect(run.requests.map(request => request.body)).toEqual([
      { dryRun: true, maxItems: 250 },
      { dryRun: true, maxItems: 250, continuationToken: 'next-batch' },
    ]);
  });

  it('uses acknowledged partial progress when retrying a bounded timeout', async () => {
    const run = await runWorkflow([
      { status: 504, body: { retryable: true, partialResult: result(false, 'resume-after-seven') } },
      { status: 200, body: result(true) },
    ]);
    expect(run.exitCode).toBe(0);
    expect(run.requests[1].body.continuationToken).toBe('resume-after-seven');
  });

  it('fails explicitly for source changes instead of silently restarting or claiming completion', async () => {
    const run = await runWorkflow([{ status: 409, body: { error: 'Source changed.' } }]);
    expect(run.exitCode).toBe(1);
    expect(run.requests).toHaveLength(1);
  });
});
