import { hasGatewayCredentials } from "@/lib/recommend/embeddings";

export const DEFAULT_CHAT_MODEL = "anthropic/claude-haiku-5-5";

/** Gateway model id ("provider/model") used by chat, plan narrative and admin AI tools. */
export function getChatModel(): string {
  return process.env.CHAT_AI_MODEL?.trim() || DEFAULT_CHAT_MODEL;
}

/** True when AI Gateway credentials (API key or Vercel OIDC token) are configured. */
export function aiAvailable(): boolean {
  return hasGatewayCredentials();
}
