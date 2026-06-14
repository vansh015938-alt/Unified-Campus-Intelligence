import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.GROQ_API_KEY || "";
const client = new OpenAI({
  apiKey: apiKey,
  baseURL: "https://api.groq.com/openai/v1"
});

async function run() {
  try {
    const list = await client.models.list();
    console.log(JSON.stringify(list.data.map(m => m.id), null, 2));
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

run();
