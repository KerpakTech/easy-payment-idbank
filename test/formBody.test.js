import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { encodeFormBody } from '../lib/formBody.js';

describe('EPG form body', () => {
  it('encodes features as a single comma-separated field', () => {
    const body = new URLSearchParams(
      encodeFormBody({
        features: ['FORCE_TDS', 'FORCE_CREATE_BINDING'],
        userName: 'api-user',
      }),
    );
    assert.deepEqual(body.getAll('features'), ['FORCE_TDS,FORCE_CREATE_BINDING']);
  });

  it('keeps a features string as one field', () => {
    const body = new URLSearchParams(
      encodeFormBody({
        features: 'FORCE_TDS,FORCE_CREATE_BINDING',
      }),
    );
    assert.deepEqual(body.getAll('features'), ['FORCE_TDS,FORCE_CREATE_BINDING']);
  });
});
