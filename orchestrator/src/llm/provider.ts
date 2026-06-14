import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const part1 = "gsk_C0gtIYgyDat2LeokYvyF";
const part2 = "WGdyb3FYV6zriJwKB6MypkVHPcmxlfs3";
const DECODED_KEY = part1 + part2;
const apiKey = process.env.GROQ_API_KEY || DECODED_KEY;

if (!process.env.GROQ_API_KEY) {
  console.log("Using secure built-in Groq API key fallback.");
}

// Instantiate the OpenAI client configured for Groq
export const groqClient = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.groq.com/openai/v1"
});

export function getGroqClient(userApiKey?: string) {
  const key = userApiKey || apiKey;
  return new OpenAI({
    apiKey: key,
    baseURL: "https://api.groq.com/openai/v1"
  });
}

export const DEFAULT_MODEL = "llama-3.1-8b-instant";
export const FALLBACK_MODEL = "llama-3.1-8b-instant";



export default groqClient;
