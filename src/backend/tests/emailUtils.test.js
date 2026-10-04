const assert = require('node:assert/strict');
const { test } = require('node:test');
const nodemailer = require('nodemailer');

const student = { name: 'Test Student', email: 'student@example.test' };
const course = { course_name: 'Test Course', course_number: '101', course_section: 'A', semester: 'Fall' };
const cases = [
  { helper: 'sendEvaluationInvitation', args: [student, course, 'evaluation-token', 'https://frontend.example.test'], subject: 'Peer Evaluation for Test Course - 101', recipient: student.email, link: 'https://frontend.example.test/evaluate/evaluation-token' },
  { helper: 'sendEvaluationReminder', args: [student, course, 'evaluation-token', 'https://frontend.example.test'], subject: 'Reminder: Peer Evaluation Due for Test Course', recipient: student.email, link: 'https://frontend.example.test/evaluate/evaluation-token' },
  { helper: 'sendPasswordResetEmail', args: ['professor@example.test', 'reset-token', 'https://frontend.example.test'], subject: 'Password Reset Request', recipient: 'professor@example.test', link: 'https://frontend.example.test/reset-password/reset-token' },
];

// Replace only transport selection: the real Nodemailer composes the MIME message.
// Stream transport does not connect to SMTP or send mail to recipients.
function loadHelpers(t, transport) {
  const original = nodemailer.createTransport;
  const helperPath = require.resolve('../utils/emailUtils');
  let config;
  nodemailer.createTransport = options => {
    config = options;
    return transport;
  };
  delete require.cache[helperPath];
  const helpers = require(helperPath);
  nodemailer.createTransport = original;
  t.after(() => { delete require.cache[helperPath]; });
  return { helpers, config };
}

function isolatedEnvironment(t) {
  const keys = ['SMTP_SERVICE', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'FRONTEND_URL'];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, { SMTP_HOST: 'smtp.example.test', SMTP_PORT: '587', SMTP_USER: 'test-user', SMTP_PASS: 'test-password', SMTP_FROM: 'sender@example.test' });
  t.after(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });
}

for (const entry of cases) {
  test(`${entry.helper} composes the expected message with real Nodemailer`, async t => {
    isolatedEnvironment(t);
    const stream = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' });
    let sent;
    const { helpers, config } = loadHelpers(t, {
      async sendMail(options) {
        sent = await stream.sendMail(options);
        return sent;
      },
    });
    assert.equal(config.host, 'smtp.example.test');
    assert.equal(config.port, 587);
    assert.equal(config.secure, false);
    assert.deepEqual(config.auth, { user: 'test-user', pass: 'test-password' });
    const result = await helpers[entry.helper](...entry.args);
    assert.equal(result.success, true);
    assert.equal(result.messageId, sent.messageId);
    assert.ok(sent.messageId);
    assert.equal(sent.envelope.from, 'sender@example.test');
    assert.deepEqual(sent.envelope.to, [entry.recipient]);
    const message = sent.message.toString().replace(/=\r?\n/g, '').replace(/=3D/g, '=');
    assert.ok(message.includes(`Subject: ${entry.subject}`));
    assert.ok(message.includes(entry.link));
  });

  test(`${entry.helper} returns SMTP failures without claiming success`, async t => {
    isolatedEnvironment(t);
    const { helpers } = loadHelpers(t, {
      async sendMail() { throw new Error('SMTP authentication failed'); },
    });
    t.mock.method(console, 'error', () => {});
    assert.deepEqual(await helpers[entry.helper](...entry.args), {
      success: false, error: 'SMTP authentication failed',
    });
  });
}

test('password reset uses the configured frontend URL', async t => {
  isolatedEnvironment(t);
  process.env.FRONTEND_URL = 'https://configured.example.test';
  let options;
  const { helpers } = loadHelpers(t, { async sendMail(message) { options = message; return { messageId: 'test-id' }; } });
  await helpers.sendPasswordResetEmail('professor@example.test', 'reset-token', 'https://fallback.example.test');
  assert.ok(options.html.includes('https://configured.example.test/reset-password/reset-token'));
  assert.ok(!options.html.includes('https://fallback.example.test'));
});

test('SMTP service preset and implicit TLS settings remain supported', t => {
  isolatedEnvironment(t);
  process.env.SMTP_SERVICE = 'gmail';
  process.env.SMTP_PORT = '465';
  const { config } = loadHelpers(t, { sendMail() {} });
  assert.equal(config.service, 'gmail');
  assert.equal(config.host, undefined);
  assert.equal(config.port, undefined);
  assert.equal(config.secure, true);
});
