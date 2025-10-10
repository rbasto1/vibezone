# Project Management

## Features

- [ ] Paid plans: Stripe integration (Clerk? Autumn? Polar?)
- [ ] Add user profile (name, avatar, age, gender, country, etc)
- [ ] Backend processing of messages: save the AI response without the need for a frontend
- [ ] See if a History adapter solves the problem instead of hacking AssistantCloud

## Bugs

- [ ] Bug: on mobile, closing the model details modal closes also the model selector
- [ ] Text attachments are going inline inside <attachment>
- [ ] Disable sending when attachments are not compatible with one of the models

## Improvements

- [ ] Thumb up/down (or stars?)
- [ ] Allow user to pin favorite models
- [ ] Import chats from OpenAI format
- [ ] Export chats to OpenAI format
- [ ] Add analytics (Posthog?)
- [ ] Projects (group threads) - paying only
- [x] Add a "do not show again" option to the warning about discarding a panel
- [ ] Add Python project to calculate usage of non-OpenRouter models
- [ ] Syntax highlighting: auto-detect language (switch to highlight.js?)
- [x] Add `api_created_at` to models and use our import date for created_at
- [ ] Add auto-translation button to admin (model descriptions)
- [x] Schedule daily usage calculation

## MVP (done)

- [x] Add SEO metadata
- [x] Mobile version
- [x] Tag providers that do not have zdr
- [x] Render LaTeX and HTML
- [x] Add syntax highlighting
- [x] Limit usage for anon users
- [x] Identify free models with a badge
- [x] Improve db update from stage to stage
- [x] Upload images and PDF files (when the model supports it)
- [x] Add tools to browse the internet
- [x] Render reasoning
- [x] Render images and files
- [x] Improve ssr of db models/providers (use script to generate json)
- [x] Only allow upload of files if logged in
- [x] Add Privacy Policy and Terms of Service
- [x] Archive -> Delete
- [x] When loading saved threads, make the suggestions disappear
- [x] Store usage per user in db
- [x] "Full Screen" button on each chat
- [x] Disable auto-scroll
- [x] Add scroll to bottom button
- [x] Create job to update costs in usage table
- [x] Tracking/usage dashboard
- [x] Auto-refresh chat list with timer
- [x] Move chevron to the right
- [x] Prevent errors when choosing suggested models
- [x] Add cost/completion to dashboard
- [x] Improve dashboard queries
- [x] Warn about discarding a panel
- [x] Translate to Brazilian Portuguese
- [x] Assign .br domains
- [x] Explore bot protection (Vercel BotID? Arcjet? hCaptcha?)
- [x] Add Maritaca AI models
- [x] Add model descriptions to (i) icon
- [x] Language-specific chat titles
- [x] Paginate chat history
- [x] Add reasoning effort slider
- [x] Search chats (backend search of all messages)
- [x] Add user preferences (auto-scroll, hidden providers, pre-prompt)
- [x] Fix <lineBreak/> not working on i18n
- [x] Keep composer text in SessionStorage
- [x] Show spinner when switching languages
- [x] Limit usage for free users (400)
- [x] Show deleted providers and models in the admin
- [x] Refactor vz-open-login event to use jotai state
- [x] Fix toast colors
- [x] Simplify model selection metadata, add colors to capabilities buttons
- [x] Add description editor to admin
