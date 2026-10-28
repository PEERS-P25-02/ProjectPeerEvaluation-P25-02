// CW-07: check invitation content and error contracts without connecting to SMTP.
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
const environment = vi.hoisted(() => {
  const original = Object.fromEntries(
    [
      'SMTP_AUTH_REQUIRED',
      'SMTP_USER',
      'SMTP_PASS',
      'SMTP_FROM',
      'SMTP_SERVICE',
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_SECURE',
    ].map((key) => [key, process.env[key]]),
  );
  process.env.SMTP_AUTH_REQUIRED = 'false';
  for (const key of [
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    'SMTP_SERVICE',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
  ])
    delete process.env[key];
  return original;
});
const require = createRequire(import.meta.url);
const nodemailer = require('nodemailer');
const sendMail = vi.fn();
const transport = vi
  .spyOn(nodemailer, 'createTransport')
  .mockReturnValue({ sendMail });
const modulePath = require.resolve('../utils/emailUtils');
const priorModule = require.cache[modulePath];
delete require.cache[modulePath];
const { sendEvaluationInvitation } = require('../utils/emailUtils');
const student = { name: 'Synthetic Student', email: 'student@example.invalid' };
const course = {
  course_name: 'Software Testing',
  course_number: '4724',
  course_section: '01',
  semester: 'Fall',
};
afterEach(() => sendMail.mockReset());
afterAll(() => {
  transport.mockRestore();
  delete require.cache[modulePath];
  if (priorModule) require.cache[modulePath] = priorModule;
  for (const [key, value] of Object.entries(environment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
describe('evaluation invitation composition', () => {
  it('sends personalized course context and identical encoded HashRouter links', async () => {
    sendMail.mockResolvedValue({ messageId: 'synthetic-message' });
    const result = await sendEvaluationInvitation(
      student,
      course,
      'token/with spaces',
      'https://peers.example.invalid/app/#/old-route',
      '2026-11-01T12:00:00Z',
    );
    expect(result).toEqual({ success: true, messageId: 'synthetic-message' });
    expect(sendMail).toHaveBeenCalledOnce();
    const message = sendMail.mock.calls[0][0];
    expect(message).toMatchObject({
      from: 'noreply@peerevaluation.com',
      to: student.email,
      subject: 'Peer Evaluation for Software Testing - 4724',
    });
    const link =
      'https://peers.example.invalid/app/#/evaluate/token%2Fwith%20spaces';
    expect(message.html).toContain(`href="${link}"`);
    expect(message.html.split(link)).toHaveLength(3);
    expect(message.html).toContain('Dear Synthetic Student');
    expect(message.html).toContain('Fall');
    expect(message.html).not.toContain('No deadline set');
  });
  it('uses the default local destination and marks an absent deadline', async () => {
    sendMail.mockResolvedValue({ messageId: 'synthetic-message' });
    await sendEvaluationInvitation(student, course, 'synthetic-token');
    expect(sendMail.mock.calls[0][0].html).toContain(
      'http://localhost:3000/#/evaluate/synthetic-token',
    );
    expect(sendMail.mock.calls[0][0].html).toContain('No deadline set');
  });
  it('returns a failure contract when the transport rejects a message', async () => {
    sendMail.mockRejectedValue(new Error('Synthetic SMTP rejection'));
    await expect(
      sendEvaluationInvitation(student, course, 'synthetic-token'),
    ).resolves.toEqual({ success: false, error: 'Synthetic SMTP rejection' });
    expect(sendMail).toHaveBeenCalledOnce();
  });
});
