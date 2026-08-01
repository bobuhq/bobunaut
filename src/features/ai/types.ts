export type BobuAIRole = "user" | "assistant";

export interface BobuAIMessage {
  id: string;
  role: BobuAIRole;
  content: string;
  createdAt: string;
}

export interface BobuAIRequestMessage {
  role: BobuAIRole;
  content: string;
}

export interface BobuAIResponse {
  ok: boolean;
  message?: string;
  error?: string;
}
