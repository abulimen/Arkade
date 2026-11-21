import { describe, expect, it, vi } from 'vitest';
import { decideWolfGuessMatch } from '@/server/ai/geminiDecision';

describe('decideWolfGuessMatch (Gemini Decision 1 fallback)', () => {
  it('returns false immediately without calling fetch when GEMINI_API_KEY is missing', async () => {
    const fetchSpy = vi.fn();
    const ok = await decideWolfGuessMatch({
      guess: 'The Big Boat',
      secretWord: "Noah's Ark",
      category: 'Objects',
      apiKey: '',
      fetchImpl: fetchSpy as unknown as typeof fetch,
    });
    expect(ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('calls Gemini v1beta decisions endpoint and approves high-probability matches', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          answers: {
            matches_secret_word: { type: 'noul', noul: 0.94, confidence: 0.92 },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const ok = await decideWolfGuessMatch({
      guess: 'Arc of Noa',
      secretWord: "Noah's Ark",
      category: 'Bible Stories',
      aliases: ['The Ark'],
      apiKey: 'test-gemini-key',
      fetchImpl: fetchSpy as unknown as typeof fetch,
    });

    expect(ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/decisions');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('test-gemini-key');
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe('gemini-decision-1');
    expect(body.questions.matches_secret_word.type).toBe('noul');
  });

  it('rejects low probability or low confidence answers', async () => {
    const lowProb = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          answers: { matches_secret_word: { type: 'noul', noul: 0.45, confidence: 0.9 } },
        }),
        { status: 200 },
      ),
    );
    expect(
      await decideWolfGuessMatch({
        guess: 'Boat',
        secretWord: "Noah's Ark",
        apiKey: 'test-key',
        fetchImpl: lowProb as unknown as typeof fetch,
      }),
    ).toBe(false);

    const lowConf = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          answers: { matches_secret_word: { type: 'noul', noul: 0.75, confidence: 0.35 } },
        }),
        { status: 200 },
      ),
    );
    expect(
      await decideWolfGuessMatch({
        guess: 'Boat',
        secretWord: "Noah's Ark",
        apiKey: 'test-key',
        fetchImpl: lowConf as unknown as typeof fetch,
      }),
    ).toBe(false);
  });

  it('fails closed (false) on HTTP errors or network exceptions', async () => {
    const httpErr = vi.fn().mockResolvedValue(new Response('rate limited', { status: 429 }));
    expect(
      await decideWolfGuessMatch({
        guess: 'Ark',
        secretWord: "Noah's Ark",
        apiKey: 'test-key',
        fetchImpl: httpErr as unknown as typeof fetch,
      }),
    ).toBe(false);

    const netErr = vi.fn().mockRejectedValue(new Error('network down'));
    expect(
      await decideWolfGuessMatch({
        guess: 'Ark',
        secretWord: "Noah's Ark",
        apiKey: 'test-key',
        fetchImpl: netErr as unknown as typeof fetch,
      }),
    ).toBe(false);
  });
});
