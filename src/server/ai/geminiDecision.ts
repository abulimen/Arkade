const DECISIONS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/decisions';
const DEFAULT_TIMEOUT_MS = 4000;

export interface WolfGuessDecisionInput {
  guess: string;
  secretWord: string;
  category?: string;
  aliases?: readonly string[];
  apiKey?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface DecisionNoulAnswer {
  type?: string;
  noul?: number;
  confidence?: number;
}

interface DecisionsApiResponse {
  answers?: {
    matches_secret_word?: DecisionNoulAnswer;
  };
}

/**
 * Fallback semantic check using Google's Gemini Decision 1 API (`gemini-decision-1`).
 * Called only when deterministic `guessMatches()` returns false for a Spot the Wolf guess.
 * Fails closed (`false`) if `GEMINI_API_KEY` is unset, the request times out, or the API errors.
 */
export async function decideWolfGuessMatch({
  guess,
  secretWord,
  category = '',
  aliases = [],
  apiKey = process.env.GEMINI_API_KEY,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = fetch,
}: WolfGuessDecisionInput): Promise<boolean> {
  const key = apiKey?.trim();
  const cleanGuess = guess.trim();
  if (!key || !cleanGuess || !secretWord.trim()) return false;

  try {
    const res = await fetchImpl(DECISIONS_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-goog-api-key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-decision-1',
        input: JSON.stringify({
          secret_word: secretWord,
          category,
          accepted_aliases: aliases,
          player_guess: cleanGuess,
        }),
        questions: {
          matches_secret_word: {
            type: 'noul',
            instructions:
              'Does player_guess refer to the same biblical person, place, object, or concept as secret_word (or accepted_aliases) within category? Answer yes if the guess clearly shows the player knows the exact secret word despite spelling mistakes, spacing, plurals, abbreviations, or well-known equivalent titles. Answer no for broader category guesses, related-but-different Bible terms, or unrelated words.',
          },
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) return false;
    const data = (await res.json()) as DecisionsApiResponse;
    const answer = data.answers?.matches_secret_word;
    if (!answer || answer.type !== 'noul' || typeof answer.noul !== 'number') {
      return false;
    }
    const confident = typeof answer.confidence === 'number' ? answer.confidence >= 0.55 : true;
    return answer.noul >= 0.7 && confident;
  } catch {
    return false;
  }
}
