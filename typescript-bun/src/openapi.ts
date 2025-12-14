export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "AI Service Notuly API",
    description: "REST API untuk summarization dan RAG.",
    version: "1.0.0",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local dev",
    },
  ],
  paths: {
    "/": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          200: {
            description: "OK",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                  example: "Hello Hono!",
                },
              },
            },
          },
        },
      },
    },
    "/vllm_chatopenai": {
      get: {
        tags: ["Summarizer"],
        summary: "Ringkas transcript lokal menggunakan ChatOpenAI (RUNPOD)",
        responses: {
          200: {
            description: "Hasil ringkasan",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                },
              },
            },
          },
          500: {
            $ref: "#/components/responses/InternalError",
          },
        },
      },
    },
    "/gpt_oss": {
      post: {
        tags: ["Summarizer"],
        summary: "Prompt bebas via GPT OSS (Groq)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/GptOssRequest",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Jawaban model",
            content: {
              "text/plain": {
                schema: {
                  type: "string",
                },
              },
            },
          },
          400: {
            $ref: "#/components/responses/BadRequest",
          },
          500: {
            $ref: "#/components/responses/InternalError",
          },
        },
      },
    },
    "/summarize_chunk": {
      get: {
        tags: ["Summarizer"],
        summary: "Ringkas transcript per-chunk secara paralel",
        responses: {
          200: {
            description: "Ringkasan per chunk dan final",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SummarizeChunkResponse",
                },
              },
            },
          },
          500: {
            $ref: "#/components/responses/InternalError",
          },
        },
      },
    },
    "/summarized": {
      get: {
        tags: ["Summarizer"],
        summary: "Ringkas transcript.txt menggunakan prompt YAML",
        responses: {
          200: {
            description: "Ringkasan lengkap",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SummarizedResponse",
                },
              },
            },
          },
          500: {
            $ref: "#/components/responses/InternalError",
          },
        },
      },
    },
  },
  components: {
    schemas: {
      GptOssRequest: {
        type: "object",
        required: ["input"],
        properties: {
          input: {
            type: "string",
            description: "Prompt untuk dikirim ke model.",
            example: "Ringkas poin utama rapat berikut...",
          },
        },
      },
      SummarizeChunkResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          totalChunks: { type: "integer", minimum: 0 },
          individualSummaries: {
            type: "array",
            items: { type: "string" },
          },
          finalSummary: { type: "string" },
        },
        example: {
          success: true,
          totalChunks: 3,
          individualSummaries: [
            "Chunk 1 diringkas ...",
            "Chunk 2 diringkas ...",
            "Chunk 3 diringkas ...",
          ],
          finalSummary: "Ringkasan akhir gabungan.",
        },
      },
      SummarizedResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          summary: { type: "string" },
          savedTo: { type: "string" },
          originalLength: { type: "integer" },
          summaryLength: { type: "integer" },
        },
        example: {
          success: true,
          summary: "Ringkasan dari transcript.txt...",
          savedTo: "/path/to/transcript_summary.txt",
          originalLength: 12000,
          summaryLength: 900,
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          error: { type: "string" },
        },
        example: {
          success: false,
          error: "Internal Server Error",
        },
      },
    },
    responses: {
      BadRequest: {
        description: "Permintaan tidak valid",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
          },
        },
      },
      InternalError: {
        description: "Kesalahan server",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
          },
        },
      },
    },
  },
} as const;

