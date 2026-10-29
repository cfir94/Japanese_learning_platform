// Instructions and response schemas for the Gemini checks.
// Feedback is written in Hebrew for the learner; the checking rules are in English for the model.

export const SYSTEM = `You are a precise, encouraging Japanese teacher. Your student is a Hebrew-speaking adult
studying with Genki (3rd edition), roughly lessons 8–23, preparing to host two Japanese friends in Israel.

Checking rules — follow them strictly:
- Judge meaning and grammar, not one model answer. Accept every natural, correct alternative.
- Accept casual or polite register unless the task explicitly asks for one. Never mark a correct polite
  form wrong because casual is being practised, or the other way round.
- Accept kana or kanji spellings. Do not penalise kanji choice.
- Omitting particles that are commonly dropped in casual speech (を, は, が, へ) is NOT an error in casual
  sentences. Wrong particles (e.g. もが, 5年に for a duration) ARE errors.
- Katakana for Israeli place names and foods (エイラット, ティムナ, 死海, フムス, クナーファ, マラビ, シャクシュカ…)
  may be spelled in any reasonable way.
- Separate the target grammar point from other slips. A sentence can use the target correctly and still
  contain another mistake; report the other mistake separately.
- Never invent errors. If the answer is correct, say so plainly.
- Feedback goes to the learner in Hebrew: short, concrete, no more than two sentences. Japanese examples
  inside the Hebrew are fine. Do not lecture.`;

export function gradePrompt(items) {
  return `Grade each answer. For each item:
- "target" is the grammar point being tested; "models" are example correct answers (not the only ones).
- score 2 = the target grammar is used correctly and the sentence conveys the Hebrew prompt (minor slips
  outside the target are allowed — mention them in "other").
- score 1 = the target is attempted but formed wrongly, or the target is right but the meaning is clearly off.
- score 0 = the target is missing or wrong, or the answer is empty / not Japanese.
- "corrected": a natural correct sentence that stays as close as possible to the learner's own wording.
  If the answer is already correct, repeat it.
- "feedback": Hebrew, max two short sentences, about the target first.
- "other": Hebrew, one short note about a non-target mistake, or an empty string.

Items (JSON):
${JSON.stringify(items, null, 1)}`;
}

export function writePrompt(task) {
  return `The student wrote a short free text in Japanese for this task (the task is in Hebrew):
${task.prompt}

Student's text:
"""
${task.answer}
"""

Grammar catalog (id: pattern — Hebrew title). Use these ids in "points":
${task.catalog}

Return:
- "task_done": 2 = the task is fully done, 1 = partly, 0 = not.
- "summary": Hebrew, 2–3 sentences: what worked, the single most important thing to fix.
- "points": catalog points the student actually used. verdict "ok" = used correctly, "error" = attempted
  but formed wrongly. Quote the student's words in "evidence". Only include points really present.
- "errors": real mistakes only, each with the student's words, a correction and a short Hebrew note.
  Do not list register choices or natural particle omission as errors.
- "corrected_text": the whole text corrected, keeping the student's voice and register.`;
}

export function speechPrompt(task) {
  return `This is a recording of the student answering a speaking task (in Hebrew):
${task.prompt}

First transcribe exactly what you hear, in Japanese, without correcting mistakes (keep fillers like えっと,
mark long pauses as "…", mark unclear words as [?]). Then assess.

Grammar catalog (id: pattern — Hebrew title). Use these ids in "points":
${task.catalog}

Return:
- "transcript": verbatim Japanese transcript.
- "task_done": 2 = fully, 1 = partly, 0 = not.
- "summary": Hebrew, 2–3 sentences: what worked, the single most important thing to fix.
- "points": catalog points used, verdict "ok" or "error", with the spoken words as evidence.
- "errors": real mistakes with a correction and a short Hebrew note.
- "fluency_note": Hebrew, one or two sentences on hesitation, restarts and flow. Be modest: describe what
  you hear, do not score.
- "pronunciation_note": Hebrew, only if specific words were hard to understand; otherwise an empty string.
  Do not give a pronunciation score.`;
}

const ERRORS = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      original: { type: 'STRING' },
      corrected: { type: 'STRING' },
      note: { type: 'STRING' },
    },
    required: ['original', 'corrected', 'note'],
  },
};

const POINTS = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      id: { type: 'STRING' },
      verdict: { type: 'STRING', enum: ['ok', 'error'] },
      evidence: { type: 'STRING' },
    },
    required: ['id', 'verdict', 'evidence'],
  },
};

export const GRADE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    results: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          score: { type: 'INTEGER', description: '0, 1 or 2' },
          corrected: { type: 'STRING' },
          feedback: { type: 'STRING' },
          other: { type: 'STRING' },
        },
        required: ['id', 'score', 'corrected', 'feedback', 'other'],
      },
    },
  },
  required: ['results'],
};

export const WRITE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    task_done: { type: 'INTEGER', description: '0, 1 or 2' },
    summary: { type: 'STRING' },
    points: POINTS,
    errors: ERRORS,
    corrected_text: { type: 'STRING' },
  },
  required: ['task_done', 'summary', 'points', 'errors', 'corrected_text'],
};

export const SPEECH_SCHEMA = {
  type: 'OBJECT',
  properties: {
    transcript: { type: 'STRING' },
    task_done: { type: 'INTEGER', description: '0, 1 or 2' },
    summary: { type: 'STRING' },
    points: POINTS,
    errors: ERRORS,
    fluency_note: { type: 'STRING' },
    pronunciation_note: { type: 'STRING' },
  },
  required: ['transcript', 'task_done', 'summary', 'points', 'errors', 'fluency_note', 'pronunciation_note'],
};
