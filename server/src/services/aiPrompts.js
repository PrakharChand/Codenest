/**
 * server/src/services/aiPrompts.js
 *
 * Centralized prompt engineering module for all 5 Gemini AI features.
 * Isolates prompt wording from service invocation and network handling logic.
 */

const aiPrompts = {
  /**
   * 1. suggestTags prompt
   * @param {string} content
   * @returns {string}
   */
  suggestTags: (content) => `You are a tag-suggestion engine for a developer platform.
Given the following code or post content, return ONLY a JSON object with a single key "tags"
containing an array of 4 to 6 lowercase, single-word or hyphenated tags that best categorize it.
No prose, no markdown, no explanation — only the JSON object.

Example output: {"tags":["javascript","react","hooks","state-management"]}

Content:
${content.slice(0, 4000)}`,

  /**
   * 2. anonymityCheck prompt (Most product-critical guard)
   * @param {string} text
   * @returns {string}
   */
  anonymityCheck: (text) => `You are an anonymity guard for a code-review platform where all submissions must be anonymous.
Scan the following text for any information that could identify the real author:
  - Real names
  - Email addresses
  - GitHub or Twitter/X handles
  - Company or employer names
  - University or college names

Return ONLY a JSON object with this exact shape:
{
  "safe": true|false,
  "findings": [
    { "type": "name|email|github|twitter|company|university", "value": "the detected text", "suggestion": "how to anonymize it" }
  ]
}
"safe" is true only if findings is an empty array.
No prose, no markdown, no explanation — only the JSON object.

Text to analyze:
${text.slice(0, 8000)}`,

  /**
   * 3. generateRoadmap prompt
   * @param {{ level: string, knownTech: string, goal: string, hoursPerWeek: number }} profile
   * @returns {string}
   */
  generateRoadmap: ({ level, knownTech, goal, hoursPerWeek }) => `You are a senior software engineering mentor.
Generate a personalized learning roadmap for a developer with this profile:
  - Skill level: ${level}
  - Known technologies: ${knownTech}
  - Learning goal: ${goal}
  - Available hours per week: ${hoursPerWeek}

Return ONLY a JSON object with this shape:
{
  "phases": [
    {
      "title": "Phase name",
      "duration_weeks": 4,
      "topics": ["topic1", "topic2"],
      "resources": [{ "title": "...", "url": "...", "type": "course|book|docs|video" }],
      "milestone": "What the learner can do after this phase"
    }
  ],
  "total_weeks": 12,
  "summary": "One sentence summary of the roadmap"
}
No prose, no markdown, no explanation — only the JSON object.`,

  /**
   * 4. suggestConnections prompt
   * @param {string} myTopics
   * @param {string} candidatesText
   * @returns {string}
   */
  suggestConnections: (myTopics, candidatesText) => `You are a developer connection recommender.
The current user writes about: ${myTopics}

Candidate users and their recent post topics:
${candidatesText}

Return ONLY a JSON object with this shape:
{
  "suggestions": [
    { "user_id": 42, "reason": "One sentence on why they would make a good connection" }
  ]
}
Include at most 5 suggestions, ranked by relevance. No prose, no markdown — only the JSON object.`,

  /**
   * 5. generateAIReview prompt (Cron job review generator)
   * @param {{ title: string, content: string, language_tag: string, question: string }} submission
   * @returns {string}
   */
  generateAIReview: (submission) => `You are an expert code reviewer. Review the following code submission and provide structured feedback.

Title: ${submission.title}
Language: ${submission.language_tag}
Author's question: ${submission.question}

Code:
${submission.content.slice(0, 6000)}

Return ONLY a JSON object with this exact shape:
{
  "what_good": "Detailed feedback on what was done well (2-4 sentences)",
  "what_improve": "Specific, actionable suggestions for improvement (2-4 sentences)",
  "resources": "One or two relevant documentation links or articles (can be empty string)",
  "helpfulness_rating": 4
}
helpfulness_rating must be an integer between 1 and 5.
No prose, no markdown wrapper — only the JSON object.`,
};

module.exports = aiPrompts;
