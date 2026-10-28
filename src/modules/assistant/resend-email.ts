import https from 'https';

export class EmailDeliveryError extends Error {
  constructor(
    public code: 'RATE_LIMIT' | 'REJECTED' | 'UNKNOWN',
    message: string,
  ) {
    super(message);
  }
}

/** Small server-side REST adapter: no SDK dependency or provider errors/secrets in logs. */
export async function deliverPlanEmail(
  to: string,
  subject: string,
  text: string,
  jobId: string,
): Promise<string> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key)
    throw new EmailDeliveryError(
      'REJECTED',
      'Email credentials are not configured',
    );
  const body = JSON.stringify({
    from: process.env.ASSISTANT_EMAIL_FROM,
    to: [to],
    subject,
    text,
  });
  let deadline: ReturnType<typeof setTimeout>;
  try {
    return await new Promise<string>((resolve, reject) => {
      const unknown = () =>
        reject(
          new EmailDeliveryError(
            'UNKNOWN',
            'Email delivery outcome is unknown',
          ),
        );
      const req = https.request(
        {
          hostname: 'api.resend.com',
          path: '/emails',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            'Idempotency-Key': `plan-notification/${jobId}`,
          },
        },
        (res) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            data += chunk;
            if (data.length > 64000)
              req.destroy(new Error('Email response exceeded size limit'));
          });
          res.on('error', unknown);
          res.on('aborted', unknown);
          res.on('end', () => {
            const status = res.statusCode || 0;
            if (status === 429)
              return reject(
                new EmailDeliveryError(
                  'RATE_LIMIT',
                  'Email rate limit reached',
                ),
              );
            if (status >= 400 && status < 500)
              return reject(
                new EmailDeliveryError(
                  'REJECTED',
                  'Email provider rejected the request',
                ),
              );
            if (status < 200 || status >= 300) return unknown();
            try {
              const result = JSON.parse(data);
              if (typeof result.id !== 'string' || !result.id) return unknown();
              resolve(result.id);
            } catch {
              unknown();
            }
          });
        },
      );
      deadline = setTimeout(
        () => req.destroy(new Error('Email request timed out')),
        20000,
      );
      req.on('error', unknown);
      req.end(body);
    });
  } finally {
    clearTimeout(deadline);
  }
}
