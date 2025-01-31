import "dotenv/config";
import OpenAI from "openai";
import express from "express";
import { Inngest } from "inngest";
import { serve } from "inngest/express";
import { parseStringPromise } from "xml2js";
const pdfreader = require("pdfreader");

const MAX_PAGES = 5;
const MAX_RESULTS = 3;

async function searchArxiv(query: string, maxResults = MAX_RESULTS) {
  const response = await fetch(
    `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
      query
    )}&start=0&max_results=${maxResults}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch from arXiv API");
  }

  const data = await response.text();
  const result = await parseStringPromise(data);

  const entries = result.feed?.entry || [];
  return entries.map((entry: any) => ({
    title: entry.title?.[0] || "",
    authors: entry.author?.map((author: any) => author.name?.[0] || "") || [],
    summary: entry.summary?.[0] || "",
    link: entry.id?.[0] || "",
    published: entry.published?.[0] || "",
  }));
}

async function getPaperContent(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const pdfBuffer = Buffer.from(arrayBuffer);
  return new Promise((resolve, reject) => {
    let content = "";
    new pdfreader.PdfReader().parseBuffer(pdfBuffer, (err: any, item: any) => {
      if (err) {
        console.error("error parsing buffer", err);
        reject(err);
      } else if (item && item.text) content += `${item.text} `;
      else if (item && item.page) {
        if (item.page > MAX_PAGES) {
          resolve(content);
        } else {
          content += ` ---- Page ${item.page} ---- \n`;
        }
      } else if (!err && !item) resolve(content);
    });
  });
}

const inngest = new Inngest({
  id: "arxiv-research-assistant",
});

const arxivResearchAssistant = inngest.createFunction(
  {
    id: "arxiv-research-assistant",
  },
  {
    event: "arxiv-research-assistant.search",
  },
  async ({ event, step }) => {
    const { input, model = "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B" } =
      event.data;

    const openai = new OpenAI({
      apiKey: model.includes("deepseek")
        ? process.env.DEEPSEEK_API_KEY
        : process.env.OPENAI_API_KEY,
      ...(model.includes("deepseek")
        ? { baseURL: process.env.DEEPSEEK_BASE_URL }
        : {}),
    });
    const createCompletion = openai.chat.completions.create.bind(
      openai.chat.completions
    );

    const generateSearchQuery: any = await step.ai.wrap(
      "generate-search-query",
      createCompletion,
      {
        model: model,
        messages: [
          {
            role: "user",
            content: `You are a helpful research analyst that helps users find relevant academic papers on arXiv to answer the following question:
${input}

DO NOT answer with your current knowledge, ONLY search for papers on arXiv.
IMPORTANT: We are in the year ${new Date().getFullYear()}.

Perform your arXiv search by returning your search query in the following format:

<search_query>
{your search query}
</search_query>
`,
          },
        ],
        temperature: model.includes("deepseek") ? 0.6 : 1,
      }
    );

    const papersContents = await step.run("search-arxiv", async () => {
      if (
        generateSearchQuery.choices[0].message.content.includes(
          "<search_query>"
        )
      ) {
        console.log("found search query!");
        let searchQuery = (
          generateSearchQuery.choices[0].message.content as string
        ).match(/<search_query>(.*?)<\/search_query>/s)?.[1];
        // remove quotes and line breaks
        searchQuery = searchQuery?.replace(/["\n]/g, "");
        console.log("search query:", searchQuery);
        if (searchQuery) {
          try {
            let results = await searchArxiv(searchQuery, MAX_RESULTS);
            console.log("results:", results);
            const papersContents = [];
            for (const result of results) {
              let content = "";
              try {
                content = await getPaperContent(
                  result.link.replace("/abs/", "/pdf/")
                );
              } catch (error) {
                console.error("Error getting paper content", error);
              }
              papersContents.push(`
                    ------------------------------
                    Title: ${result.title}
                    Authors: ${result.authors.join(", ")}
                    Summary: ${result.summary}
                    Content: \n ${content}
                    ------------------------------
                  `);
            }
            return papersContents.join("\n\n");
          } catch (error) {
            console.error("Error calling tool", error);
          }
        }
      }
    });

    const generateAnalysis: any = await step.ai.wrap(
      "generate-analysis",
      createCompletion,
      {
        model: model,
        messages: [
          {
            role: "user",
            content: `You are a helpful research analyst that analyzes the papers found by the research agent to answer the following question:
${input}

Here are the papers:

${papersContents}
`,
          },
        ],
        temperature: model.includes("deepseek") ? 0.6 : 1,
      }
    );

    return {
      answer: generateAnalysis.choices[0].message.content,
    };
  }
);

// Initialize Express app
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const keepVMup = inngest.createFunction(
  {
    id: "keep-vm-up",
  },
  {
    cron: "* * * * *",
  },
  async ({}) => {
    return await fetch("https://crucial-grier-ed-be1522d6.koyeb.app/");
  }
);

app.use(
  // Expose the middleware on our recommended path at `/api/inngest`.
  "/api/inngest",
  serve({ client: inngest, functions: [arxivResearchAssistant, keepVMup] })
);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
