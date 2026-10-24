import Anthropic from "@anthropic-ai/sdk";

/** Turns an Anthropic SDK error into a message a user can act on. */
export function friendlyError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "The Anthropic API key is missing or invalid. Add ANTHROPIC_API_KEY to .env.local and restart the app.";
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return "This API key doesn't have access to the model. Check your Anthropic Console account.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Rate limit reached. Wait a moment and try again.";
  }
  if (err instanceof Anthropic.BadRequestError) {
    return `The request was rejected: ${err.message}`;
  }
  if (err instanceof Anthropic.APIError) {
    return `The AI service returned an error (${err.status ?? "network"}). Try again in a moment.`;
  }
  if (err instanceof Anthropic.AnthropicError) {
    // Typically: no API key configured at all.
    return "Couldn't connect to the AI service. Check that ANTHROPIC_API_KEY is set in .env.local, then restart the app.";
  }
  return "Something went wrong while generating the reply.";
}
