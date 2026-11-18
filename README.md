# Outreach assistant: a messaging UI concept

A design study. Professional messaging inboxes make you write every message from scratch, and voice input is left to the keyboard. This explores an assistant that drafts a personal message for each person, shows what it based the draft on, and lets you change it by voice or text before anything is sent.

Unofficial and not affiliated with LinkedIn. Every person, company and message is fictional. The drafts are scripted: there is no AI model behind them yet.

Plain HTML, CSS and JavaScript. No build step.

## Two versions

| Folder | Idea |
| --- | --- |
| `v1-batch-review/` | Pick up to five people and say what you want to say. The assistant drafts one message each, highlights the phrases taken from each profile, and you review, edit, approve or skip before sending. |
| `v2-recently-connected/` | A "Recently connected" pill in the inbox lists your 10 newest connections, each with an intro already drafted. An assistant strip above the message box takes spoken or typed instructions ("make it warmer and ask for a quick chat"), and a mic in the toolbar dictates plain text. |

## Run it

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173/v1-batch-review/` or `http://localhost:4173/v2-recently-connected/`.

## Voice input

Uses the browser's built-in speech recognition (Chrome, Edge and Safari). Chrome sends the audio to Google to transcribe it. In other browsers the mic buttons are disabled and everything still works by typing.

## Known limits

- Drafts are pre-written. The instruction box only understands shorter, warmer, more formal, ask for a chat, share portfolio and ask about roles.
- Nothing is saved between reloads.
- The image, attach, GIF and emoji icons in v2 are disabled and only show where the mic sits.
