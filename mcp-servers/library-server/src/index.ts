import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const booksPath = path.join(__dirname, "../data/books.json");

// Read books mock data on start and keep in memory
let books: any[] = [];
try {
  books = JSON.parse(fs.readFileSync(booksPath, "utf-8"));
} catch (error) {
  console.error("Failed to load books.json:", error);
}

const app = express();
app.use(cors());
app.use(express.json());

const server = new McpServer({
  name: "library-server",
  version: "1.0.0"
});

function createMcpServer() {
  const server = new McpServer({
    name: "library-server",
    version: "1.0.0"
  });

  // Tools Definitions
  server.tool(
    "search_books",
    "Search the library catalog by title, author, or subject keyword",
    {
      query: z.string().describe("Search keyword for title, author, or subject")
    },
    async ({ query }) => {
      const q = query.toLowerCase();
      const results = books.filter(b => 
        b.title.toLowerCase().includes(q) || 
        b.author.toLowerCase().includes(q) || 
        b.subject.toLowerCase().includes(q)
      );
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            source: "Central Library Catalogue (mock)",
            books: results
          }, null, 2)
        }]
      };
    }
  );

  server.tool(
    "get_book_availability",
    "Check copies remaining and shelf location for a specific book",
    {
      book_id: z.string().describe("Unique book identifier (ISBN)")
    },
    async ({ book_id }) => {
      const book = books.find(b => b.id === book_id);
      if (!book) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              source: "Central Library Catalogue (mock)",
              error: `Book with ID ${book_id} not found.`
            }, null, 2)
          }],
          isError: true
        };
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            source: "Central Library Catalogue (mock)",
            book: {
              id: book.id,
              title: book.title,
              author: book.author,
              available_copies: book.available_copies,
              total_copies: book.total_copies,
              location: book.location
            }
          }, null, 2)
        }]
      };
    }
  );

  server.tool(
    "get_library_hours",
    "Retrieve library opening and closing hours",
    {},
    async () => {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            source: "Central Library Catalogue (mock)",
            hours: {
              weekdays: "08:00 AM - 10:00 PM",
              saturdays: "09:00 AM - 08:00 PM",
              sundays: "10:00 AM - 05:00 PM",
              exam_weeks: "24 Hours open for study rooms; main desk 08:00 AM - Midnight"
            }
          }, null, 2)
        }]
      };
    }
  );

  server.tool(
    "reserve_book",
    "Reserve a book for a student",
    {
      book_id: z.string().describe("ISBN of the book to reserve"),
      student_id: z.string().describe("The student's ID (e.g. STU12345)")
    },
    async ({ book_id, student_id }) => {
      const book = books.find(b => b.id === book_id);
      if (!book) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ source: "Central Library Catalogue (mock)", error: "Book not found" })
          }],
          isError: true
        };
      }
      if (book.available_copies <= 0) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              source: "Central Library Catalogue (mock)",
              error: "No copies currently available for reservation"
            })
          }]
        };
      }
      
      // Deduct copy and record borrowing in-memory
      book.available_copies -= 1;
      const returnDate = new Date();
      returnDate.setDate(returnDate.getDate() + 14); // 2 weeks duration
      const due_date = returnDate.toISOString().split("T")[0];
      
      book.borrowings.push({
        student_id,
        due_date
      });
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            source: "Central Library Catalogue (mock)",
            success: true,
            message: `Successfully reserved "${book.title}" for student ${student_id}.`,
            reservation: {
              book_id,
              title: book.title,
              student_id,
              due_date,
              location: book.location
            }
          }, null, 2)
        }]
      };
    }
  );

  server.tool(
    "get_borrowed_books",
    "Retrieve list of books currently borrowed by a student",
    {
      student_id: z.string().describe("The student's ID (e.g. STU12345)")
    },
    async ({ student_id }) => {
      const borrowed: any[] = [];
      books.forEach(b => {
        const userBorrows = b.borrowings.filter((br: any) => br.student_id === student_id);
        userBorrows.forEach((ub: any) => {
          borrowed.push({
            book_id: b.id,
            title: b.title,
            author: b.author,
            due_date: ub.due_date,
            location: b.location
          });
        });
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            source: "Central Library Catalogue (mock)",
            student_id,
            borrowed_books: borrowed
          }, null, 2)
        }]
      };
    }
  );

  return server;
}

// Map to track active SSE client sessions
const sessions = new Map<string, { transport: SSEServerTransport; server: McpServer }>();

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  const sessionId = transport.sessionId;
  const server = createMcpServer();
  sessions.set(sessionId, { transport, server });
  
  req.on("close", () => {
    sessions.delete(sessionId);
  });
  
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const session = sessions.get(sessionId);
  if (!session) {
    res.status(400).send("Session not found");
    return;
  }
  await session.transport.handlePostMessage(req, res, req.body);
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Library MCP Server running on port ${PORT}`);
});
