import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import https from 'https';

/** Server-only Gemini REST client. No SDK/runtime dependency is needed. */
@Injectable()
export class GeminiClient {
  async generate(system: string, input: string, json = false): Promise<string> {
    const key = process.env.GEMINI_API_KEY;
    if (!key)
      throw new ServiceUnavailableException(
        'Gemini is not configured yet. Your message is saved.',
      );
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    if (!/^[a-zA-Z0-9._-]+$/.test(model))
      throw new Error('Invalid GEMINI_MODEL');
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: input }] }],
      generationConfig: {
        maxOutputTokens: 8192,
        ...(json ? { responseMimeType: 'application/json' } : {}),
      },
    });
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'generativelanguage.googleapis.com',
          path: `/v1beta/models/${model}:generateContent`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            data += chunk;
            if (data.length > 2_000_000)
              req.destroy(new Error('Gemini response exceeded the size limit'));
          });
          res.on('error', () =>
            reject(
              new ServiceUnavailableException(
                'Gemini connection failed. Your message is saved.',
              ),
            ),
          );
          res.on('end', () => {
            if (res.statusCode !== 200)
              return reject(
                new ServiceUnavailableException(
                  `Gemini request failed (${res.statusCode}). Check model access, quota and server configuration.`,
                ),
              );
            try {
              const result = JSON.parse(data);
              const candidate = result.candidates?.[0];
              const output = candidate?.content?.parts
                ?.filter((p) => !p.thought && typeof p.text === 'string')
                .map((p) => p.text)
                .join('');
              if (!output || candidate.finishReason !== 'STOP')
                throw new Error('Incomplete model response');
              resolve(output);
            } catch {
              reject(
                new ServiceUnavailableException(
                  'Gemini did not return a complete answer. Please retry.',
                ),
              );
            }
          });
        },
      );
      req.setTimeout(90000, () => req.destroy(new Error('Gemini timed out')));
      req.on('error', () =>
        reject(
          new ServiceUnavailableException(
            'Gemini connection failed. Your message is saved.',
          ),
        ),
      );
      req.end(body);
    });
  }
}
