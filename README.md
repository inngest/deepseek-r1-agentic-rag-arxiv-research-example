# Agentic RAG-Powered arXiv Research Assistant

This example demonstrates how to build an intelligent research assistant using AgentKit, arXiv dataset, and the DeepSeek R1 model. The assistant helps users find and analyze relevant academic papers based on their research queries.

Requirements
To successfully follow this tutorial, you will need the following:

- Git installed
- Node 22+
- `pnpm`
- An Inngest account (for deployment)
- A Koyeb account (for the DeepSeek-R1 QWEN 32b model)

## Deploying the DeepSeek-R1 QWEN 32b model

Use the link below to deploy the DeepSeek-R1 QWEN 32b model to Koyeb in one-click:

[Deploy the model on Koyeb](https://app.koyeb.com/deploy?type=model&model=deepseek-r1-qwen-32)

From there, you can choose to either run the application locally or deploy it to Koyeb.

## Deploying the application

Deploy the application to Koyeb using the following button:

[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&repository=inngest/deepseek-r1-agentic-rag-arxiv-research-example&branch=main&name=deepseek-r1-arxiv-research)

Then, once your application is deployed, login into your Inngest dashboard and configure a new sync using the following url:

```
https://<YOUR_DOMAIN_PREFIX>.koyeb.app/api/inngest
```

Once the sync successful, navigate to the Functions tabs and invoke the `arxiv-research-assistant` function with this payload:

```json
{
  "data": {
    "input": "What are the latest advancements in deep learning optimization techniques?"
  }
}
```

You should be redirected to the Runs view and see your workflow run.

## Running the application locally

### Installation

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Configure the deployed model URL in the `.env` file:

```bash
DEEPSEEK_API_KEY=test
DEEPSEEK_BASE_URL=https://<YOUR_DOMAIN_PREFIX>.koyeb.app/v1
```

### Running the Application

1. Start the development server:

   ```bash
   pnpm dev
   ```

2. Start the Inngest Dev Server:

```bash
npx inngest-cli@latest dev
```

### Usage

Open the browser and navigate to `http://127.0.0.1:8288/` to access the Inngest Dev Server.

Navigate to the Functions tabs and invoke the `arxiv-research-assistant` function with this payload:

```json
{
  "data": {
    "input": "What are the latest advancements in deep learning optimization techniques?"
  }
}
```

You should be redirected to the Runs view and see your workflow run.

---

[LICENSE - Apache 2.0](./LICENSE)
