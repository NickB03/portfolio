---
id: analystai
type: project
title: AnalystAI
visibility: public
tags: [ai, rag, nextjs, pgvector, side-project]
aliases: [analyst ai, analyst-ai]
links: [AI Engineering, vana.bot]
---
AnalystAI is an AI document research app — you upload PDFs, it extracts and chunks the content, and you chat with a grounded AI analyst powered by retrieval-augmented generation. It's built with Next.js, React, and TypeScript using the Vercel AI SDK, OpenRouter for model access, and pgvector for similarity search.

## Why I built it
It's a focused study in doing RAG well: clean extraction, sensible chunking, and answers that stay grounded in the source documents rather than guessing. That same grounding discipline shows up across my [[AI Engineering]] work and in [[vana.bot]]. Live at https://analystai-one.vercel.app.
