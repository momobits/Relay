---
name: relay-auto
description: 'Drive Relay items end-to-end through the full code pipeline (analyze → plan/superplan → review → implement → verify → resolve) without per-skill prompting. Spawns one isolated agent per item that runs the entire pipeline and returns a structured summary; the main session never absorbs analyze landscape scans, plan code blocks, or verify diffs. Default mode picks the next item per priority rules and pauses after each; sweep mode walks N items or the whole backlog. Resumable across context compaction via on-disk session state. Use when you want to automate the code pipeline and just let Relay run.'
---

Follow the instructions in ./workflow.md.
