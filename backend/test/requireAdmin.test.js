const test = require('node:test');
const assert = require('node:assert/strict');
const requireAdmin = require('../middleware/requireAdmin');

const invoke = (user) => {
  const result = { statusCode: null, body: null, continued: false };
  const req = { user };
  const res = {
    status(statusCode) {
      result.statusCode = statusCode;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };

  requireAdmin(req, res, () => {
    result.continued = true;
  });
  return result;
};

test('allows administrators through the middleware', () => {
  assert.deepEqual(invoke({ id: 'admin-id', role: 'admin' }), {
    statusCode: null,
    body: null,
    continued: true,
  });
});

test('rejects regular members with a forbidden response', () => {
  assert.deepEqual(invoke({ id: 'member-id', role: 'user' }), {
    statusCode: 403,
    body: { msg: 'Administrator access required' },
    continued: false,
  });
});

test('rejects requests without an authenticated user', () => {
  assert.deepEqual(invoke(undefined), {
    statusCode: 403,
    body: { msg: 'Administrator access required' },
    continued: false,
  });
});
