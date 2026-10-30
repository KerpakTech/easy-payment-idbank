import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { encodeFormBody } from '../lib/formBody.js';

describe('EPG form body', () => {
  it('encodes features as a single semicolon-separated field', () => {
    const raw = encodeFormBody({
      features: ['FORCE_TDS', 'FORCE_SSL'],
      userName: 'api-user',
    });
    const body = new URLSearchParams(raw);
    assert.equal(raw.includes('FORCE_TDS;FORCE_SSL'), true);
    assert.deepEqual(body.getAll('features'), ['FORCE_TDS;FORCE_SSL']);
  });

  it('keeps a features string as one field', () => {
    const body = new URLSearchParams(
      encodeFormBody({
        features: 'FORCE_TDS',
      }),
    );
    assert.deepEqual(body.getAll('features'), ['FORCE_TDS']);
  });
});
