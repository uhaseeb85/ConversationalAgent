import { chatCompletion, type AIConfig, type ChatMessage } from './ai-client'
import type { Question } from '../types'

/**
 * Use the AI model to extract a concise, structured answer from a
 * free-form natural-language sentence typed by the user.
 *
 * Skips extraction (returns raw input) when:
 *  - AI is disabled
 *  - The question type is a select/date (widget answers are already structured)
 *  - The raw input is very short (≤ 3 words → probably already a direct value)
 */
export async function extractAnswer(
  rawInput: string,
  question: Question,
  aiConfig: AIConfig
): Promise<string> {
  // Types that already produce structured values — no extraction needed
  const structuredTypes = new Set([
    'single-select',
    'multi-select',
    'yes-no',
    'date',
    'number',
  ])
  if (structuredTypes.has(question.type)) return rawInput
  if (!aiConfig.enabled) return rawInput

  const trimmed = rawInput.trim()
  if (!trimmed) return rawInput

  // Short answers (≤ 3 words) are likely direct values
  if (trimmed.split(/\s+/).length <= 3) return trimmed

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a data-extraction assistant. Given a question and a user's conversational reply, extract ONLY the concrete answer value. Return just the value — no explanation, no quotes, no extra text.

Examples:
  Question: "What is your email address?"
  User reply: "Oh sure, you can reach me at john@example.com"
  Output: john@example.com

  Question: "What is the application name?"
  User reply: "We're calling it Project Phoenix for now"
  Output: Project Phoenix`,
    },
    {
      role: 'user',
      content: `Question: "${question.label}"
User reply: "${trimmed}"

Extract the answer value:`,
    },
  ]

  try {
    const extracted = await chatCompletion(messages, aiConfig)
    const result = extracted.trim().replace(/^["']|["']$/g, '') // strip wrapping quotes
    return result || trimmed
  } catch {
    // If AI fails, fall back to raw input
    return trimmed
  }
}
