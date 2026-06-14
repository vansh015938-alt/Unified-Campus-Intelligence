import { Response } from "express";
import { DEFAULT_MODEL, getGroqClient } from "../llm/provider.js";
import mcpManager from "../mcpClients/manager.js";


// Helper function to write standard SSE events to Express Response
export function writeSSE(res: Response, data: any) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export async function runAgentLoop(
  messages: ChatMessage[],
  studentId: string | undefined,
  res: Response,
  studentProfile?: any,
  userApiKey?: string
) {
  const maskedUserKey = userApiKey ? `${userApiKey.substring(0, 6)}... (length: ${userApiKey.length})` : "undefined/empty";
  const envKey = process.env.GROQ_API_KEY;
  const maskedEnvKey = envKey ? `${envKey.substring(0, 6)}... (length: ${envKey.length})` : "undefined/empty";
  console.log(`[Agent Loop] userApiKey: ${maskedUserKey}, process.env.GROQ_API_KEY: ${maskedEnvKey}`);

  const groqClient = getGroqClient(userApiKey);

  // 1. Establish the system prompt, including graceful degradation warnings
  const healthStatus = mcpManager.getHealthStatus();
  const offlineServers = healthStatus
    .filter(s => s.status === "offline")
    .map(s => s.name);

  let systemPrompt = `You are "Pulse", the friendly and highly intelligent AI campus assistant for the CampusPulse dashboard. You help students navigate library books, cafeteria food, events, academics, and notices/transport.

To be helpful, human-like, and intelligent, follow these behavioral guidelines:
1. CONCISE & BRIEF: Keep your answers very short, concise, and straight to the point. Avoid fluff, long intros, or excessive details unless asked. Keep paragraphs short and use compact lists.
2. CONVERSATIONAL & EMPATHETIC: Speak naturally, like a knowledgeable senior student. If a student asks about health, dietary preferences, or issues like acidity, express care and give direct, practical advice.
3. BLEND LIVE DATA WITH GENERAL KNOWLEDGE:
   - When a tool returns data, explain and interpret it briefly.
   - If a specific tool lookup fails or returns nothing, use your general knowledge to answer the query briefly (e.g. explain what the dish is, whether it's spicy/acidity-friendly) while clearly noting that this is general advice.
4. DRAW CONNECTIONS: Briefly recommend acidity-friendly or dietary-friendly alternatives from the menu if relevant.
5. STRICT TRUTHFULNESS VS. HELPFUL REASONING:
   - Never make up live dynamic facts.
   - Do use your reasoning to explain concepts or summarize rules briefly.
6. NATURAL CITATIONS: Integrate citations briefly (e.g., "According to the Cafeteria Board...", "The Library Catalog shows...").`;


  if (offlineServers.length > 0) {
    systemPrompt += `\n\nCRITICAL WARNING: The following campus servers are currently OFFLINE: ${offlineServers.join(", ")}. If the user asks for information from these servers, explain that they are currently offline and you cannot access their live data.`;
  }

  // Clone messages and inject system prompt at the beginning
  const currentMessages: ChatMessage[] = [];
  currentMessages.push({ role: "system", content: systemPrompt });

  // If a student is authenticated or a profile is active, inject their identity into context
  if (studentProfile) {
    const nameStr = studentProfile.name ? `named "${studentProfile.name}"` : "Anonymous Custom User";
    const dietaryStr = studentProfile.dietaryPreference && studentProfile.dietaryPreference !== "none"
      ? `Their dietary preference is: ${studentProfile.dietaryPreference}.`
      : "";
    const allergensStr = Array.isArray(studentProfile.allergensToAvoid) && studentProfile.allergensToAvoid.length > 0
      ? `They must avoid these allergens: ${studentProfile.allergensToAvoid.join(", ")}.`
      : "";
    const clubs = studentProfile.favoriteClubs || (studentProfile.favoriteClub ? [studentProfile.favoriteClub] : []);
    const interestsStr = clubs.length > 0
      ? `Their favorite clubs/interests are: ${clubs.join(", ")}.`
      : "";

    currentMessages.push({
      role: "system",
      content: `CURRENT USER PROFILE context:
The student you are talking to is ${nameStr}.
StudentID: "${studentProfile.id || "STU-CUSTOM"}". Use this ID when executing personalized tools (like get_borrowed_books or reserve_book).
${dietaryStr}
${allergensStr}
${interestsStr}
Use these preferences to naturally customize and prioritize recommendations (e.g., recommending vegetarian/vegan options, highlighting events for their favorite clubs) without them having to ask explicitly.`
    });
  } else if (studentId) {
    currentMessages.push({
      role: "system",
      content: `The current logged-in student ID is "${studentId}". Use this ID when executing personalized tools (like get_borrowed_books or reserve_book).`
    });
  }

  // Append user message history (filtering out any previous system messages to prevent override)
  for (const msg of messages) {
    if (msg.role !== "system") {
      currentMessages.push(msg);
    }
  }

  const serversConsulted = new Set<string>();
  let loopCount = 0;
  const maxDepth = 10;

  while (loopCount < maxDepth) {
    loopCount++;
    console.log(`Agent Loop Turn ${loopCount}...`);

    // Fetch list of tools currently exposed by online servers
    const availableTools = await mcpManager.getOpenAITools();

    // 2. Call the LLM to decide on next action (non-streaming for tool-choice evaluation)
    const response = await groqClient.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: currentMessages as any,
      tools: availableTools.length > 0 ? availableTools : undefined,
      tool_choice: availableTools.length > 0 ? "auto" : undefined,
      temperature: 0
    });

    const completionMessage = response.choices[0].message;

    // If the LLM has requested tool calls, we execute them and repeat the loop
    if (completionMessage.tool_calls && completionMessage.tool_calls.length > 0) {
      // Push assistant response to history
      currentMessages.push(completionMessage as any);

      // Execute tool calls in parallel
      const toolPromises = completionMessage.tool_calls.map(async (toolCall) => {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        // Find which server owns the tool to note it in SSE and track sources
        const healthList = mcpManager.getHealthStatus();
        let serverName = "Unknown Server";
        let serverId = "unknown";

        // Re-calculate mapping
        const toolsMap = (mcpManager as any).toolOwnerMap;
        const ownerId = toolsMap.get(toolName);
        if (ownerId) {
          serverId = ownerId;
          const match = healthList.find(h => h.id === ownerId);
          if (match) serverName = match.name;
          serversConsulted.add(ownerId);
        }

        // Notify client that tool execution has started
        writeSSE(res, {
          type: "tool_call_start",
          toolCallId: toolCall.id,
          tool: toolName,
          server: serverName,
          serverId: serverId,
          arguments: toolArgs
        });

        let contentText = "";
        try {
          const result = await mcpManager.callTool(toolName, toolArgs);
          contentText = JSON.stringify(result);
        } catch (err: any) {
          contentText = JSON.stringify({
            error: err.message || String(err),
            message: `Could not reach ${serverName}.`
          });
        }

        // Notify client that tool execution has completed
        writeSSE(res, {
          type: "tool_call_end",
          toolCallId: toolCall.id,
          tool: toolName,
          server: serverName,
          serverId: serverId,
          result: JSON.parse(contentText)
        });

        return {
          role: "tool" as const,
          tool_call_id: toolCall.id,
          name: toolName,
          content: contentText
        };
      });

      const toolResults = await Promise.all(toolPromises);
      currentMessages.push(...toolResults);
    } else {
      // 3. No tool calls requested. We are ready to stream the final answer back to the frontend.
      console.log("No further tool calls required. Streaming final response...");
      
      // Call Groq with streaming enabled for the final turn
      const stream = await groqClient.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: currentMessages as any,
        stream: true,
        temperature: 0.7
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) {
          writeSSE(res, {
            type: "text",
            text
          });
        }
      }

      // Stream the sources list
      writeSSE(res, {
        type: "sources",
        sources: Array.from(serversConsulted).map(id => {
          const match = healthStatus.find(h => h.id === id);
          return {
            id,
            name: match ? match.name : id
          };
        })
      });

      // Stream termination event
      writeSSE(res, { type: "done" });
      break;
    }
  }

  if (loopCount >= maxDepth) {
    writeSSE(res, {
      type: "text",
      text: "\n*(Error: Agent exceeded maximum tool routing depth of 10 loops. Shutting down connection).* "
    });
    writeSSE(res, { type: "done" });
  }
}
