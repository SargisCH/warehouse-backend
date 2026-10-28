import https from 'https';
import { EventEmitter } from 'events';
import { deliverPlanEmail } from './resend-email';

const savedEnv = { ...process.env };
beforeEach(() => {
  process.env = {
    ...savedEnv,
    RESEND_API_KEY: 'test-sending-key',
    ASSISTANT_EMAIL_FROM: 'sender@example.com',
  };
});
afterEach(() => {
  process.env = { ...savedEnv };
  jest.restoreAllMocks();
});
function response(status: number, payload: string) {
  const req: any = new EventEmitter();
  const res: any = new EventEmitter();
  res.statusCode = status;
  res.setEncoding = jest.fn();
  let callback: any;
  req.end = jest.fn(() => {
    callback(res);
    process.nextTick(() => {
      res.emit('data', payload);
      res.emit('end');
    });
  });
  req.destroy = jest.fn((error) => {
    req.emit('error', error);
    return req;
  });
  const request = jest.spyOn(https, 'request').mockImplementation(((
    options: any,
    handler: any,
  ) => {
    callback = handler;
    return req;
  }) as any);
  return { request, req };
}

describe('Resend REST delivery', () => {
  it('posts the notification with a stable job idempotency key', async () => {
    const { request, req } = response(200, '{"id":"provider-receipt"}');
    expect(
      await deliverPlanEmail(
        'dev@example.com',
        'Plan ready',
        'Open the authenticated plan link',
        'job-123',
      ),
    ).toBe('provider-receipt');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-sending-key',
          'Idempotency-Key': 'plan-notification/job-123',
        }),
      }),
      expect.any(Function),
    );
    expect(JSON.parse(req.end.mock.calls[0][0])).toEqual({
      from: 'sender@example.com',
      to: ['dev@example.com'],
      subject: 'Plan ready',
      text: 'Open the authenticated plan link',
    });
  });
  it.each([
    [429, 'RATE_LIMIT'],
    [403, 'REJECTED'],
    [422, 'REJECTED'],
    [500, 'UNKNOWN'],
  ])(
    'classifies status %s without storing provider payloads',
    async (status, code) => {
      response(status as number, '{"message":"private provider details"}');
      try {
        await deliverPlanEmail('dev@example.com', 'Subject', 'Text', 'job-123');
        throw new Error('Expected delivery failure');
      } catch (error) {
        expect(error.code).toBe(code);
        expect(error.message).not.toContain('private provider details');
      }
    },
  );
  it('requires a receipt rather than silently marking a malformed response as sent', async () => {
    response(200, '{"unexpected":true}');
    await expect(
      deliverPlanEmail('dev@example.com', 'Subject', 'Text', 'job-123'),
    ).rejects.toMatchObject({ code: 'UNKNOWN' });
  });
  it('does not make a request without a sending key', async () => {
    delete process.env.RESEND_API_KEY;
    const request = jest.spyOn(https, 'request');
    await expect(
      deliverPlanEmail('dev@example.com', 'Subject', 'Text', 'job-123'),
    ).rejects.toMatchObject({ code: 'REJECTED' });
    expect(request).not.toHaveBeenCalled();
  });
});
