---
id: polymorph
type: project
title: Polymorph
visibility: public
tags: [ai, multi-agent, generative-ui, nextjs, typescript, side-project]
aliases: [polymorph.fyi]
links: [AI Engineering, vana.bot]
---
Polymorph is my open-source AI platform built around a multi-agent architecture — Search, Research, and Build agents that coordinate to take a request from question to working artifact. It pairs that with a live React canvas that compiles single-file artifacts directly in the browser, so model output becomes something you can actually use and interact with.

## Architecture
It routes across multiple model providers through the Vercel AI Gateway and is instrumented with Arize Phoenix for LLM observability and continuous evaluation. Building it is how I pressure-test where multi-agent systems genuinely help versus where they add complexity — see [[AI Engineering]]. It's the most ambitious of my hands-on projects and shares DNA with [[vana.bot]].

## Why it matters
Working through a real multi-agent framework gives me firsthand insight into the strengths and limits of modern AI, which directly informs how I make [[Product Strategy]] decisions. You can find it at https://polymorph.fyi and the code at github.com/NickB03/polymorph.
