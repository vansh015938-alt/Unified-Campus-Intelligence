import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.warn("WARNING: GROQ_API_KEY is not defined in the environment. LLM orchestration will fail.");
}

// Instantiate the OpenAI client configured for Groq
export const groqClient = new OpenAI({
  apiKey: apiKey || "mock-key-for-now",
  baseURL: "https://api.groq.com/openai/v1"
});

export function getGroqClient(userApiKey?: string) {
  const key = userApiKey || process.env.GROQ_API_KEY;
  return new OpenAI({
    apiKey: key || "mock-key-for-now",
    baseURL: "https://api.groq.com/openai/v1"
  });
}

export const DEFAULT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
export const FALLBACK_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";



export default groqClient;
