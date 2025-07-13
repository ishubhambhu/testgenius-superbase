
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { Question, GeneratedQuestionPayload, QuestionStatus, TestInputMethod, LanguageOption } from "../types";
import { GEMINI_TEXT_MODEL, NUM_QUESTIONS_AI_DECIDES, DEFAULT_NUM_QUESTIONS } from "../constants";

const getAi = (): GoogleGenAI => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable not set. Please configure it.");
  }
  return new GoogleGenAI({ apiKey });
};


const parseJsonFromMarkdown = <T,>(text: string): T | null => {
  try {
    let jsonStr = text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    // Attempt to fix common JSON errors from the AI.
    // The most frequent error is a missing comma between the `options` array and the next key.
    // e.g., "options": [...] "correctAnswerIndex": 1 -> "options": [...], "correctAnswerIndex": 1
    // This regex finds a closing bracket `]` followed by optional whitespace and a double quote `"` (start of the next key)
    // and inserts a comma. This is a targeted fix for the reported error.
    jsonStr = jsonStr.replace(/\]\s*"/g, '], "');
    
    return JSON.parse(jsonStr) as T;
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    console.error("Raw text:", text);
    // The raw text is logged for debugging, but we return null to the caller.
    return null;
  }
};


export const generateQuestionsFromContent = async (
  inputType: TestInputMethod, 
  content: string,
  numQuestions: number, 
  language?: LanguageOption,
  difficultyLevel?: number,
  customInstructions?: string 
): Promise<Question[]> => {
  const aiInstance = getAi();
  
  let prompt: string;
  let languageSpecificInstructions = "";
  let targetLanguage = language || "the source document's primary language";
  let difficultyInstruction = "";
  let userProvidedInstructions = ""; 

  if (language) {
    languageSpecificInstructions = `
      - Language Focus: Generate questions *strictly* in **${language}**. 
      If the document contains text in multiple languages, focus *only* on the **${language}** content for question generation. 
      If a question or its options are primarily in another language within the source, ignore that specific question if it cannot be accurately represented in **${language}**.
      All passageText, questionText, and options in the JSON output must be in **${language}**.
    `;
    targetLanguage = language;
  }

  if (difficultyLevel && (inputType === TestInputMethod.SYLLABUS || inputType === TestInputMethod.TOPIC)) {
    difficultyInstruction = `\n- Difficulty Level: The questions should be generated at a difficulty level of **${difficultyLevel}** on a scale of 1 to 5, where 1 is the easiest and 5 is the hardest.`;
  }

  if (customInstructions && (inputType === TestInputMethod.SYLLABUS || inputType === TestInputMethod.TOPIC)) {
    userProvidedInstructions = `\n- User-Provided Custom Instructions: ${customInstructions}`;
  }


  let documentProcessingInstructions = "";
  if (inputType === TestInputMethod.DOCUMENT) {
    documentProcessingInstructions = `
    The provided content is from a document, potentially a test paper.
    Your primary tasks are:
      - Identify if there is a passage or context that should be displayed *before* the question. If so, put this passage (which can include simple HTML like <p> or <table> tags) into a 'passageText' field. The 'questionText' field should then contain the actual question that follows the passage. If there is no preceding passage, the 'passageText' field can be omitted or null.
      - Identify Actual Questions: Locate questions within the text. Questions often begin with numbering like "Question 1", "Q.1.", "1.", "प्रश्न १", "प्र. १.", and so on.
      - Ignore Non-Question Content: Disregard any introductory material, instructions to candidates, cover pages, tables of contents, or any text that is not part of a passage, a question, and its multiple-choice options.
    ${languageSpecificInstructions}
    `;
  } else {
    // For syllabus or topic, language, difficulty, and custom instructions apply
    documentProcessingInstructions = `
    Identify if there is a passage or context that should be displayed *before* the question. If so, put this passage (which can include simple HTML like <p> or <table> tags) into a 'passageText' field. The 'questionText' field should then contain the actual question that follows the passage. If there is no preceding passage, the 'passageText' field can be omitted or null.
    ${languageSpecificInstructions}${difficultyInstruction}${userProvidedInstructions}
    `;
  }

  const jsonStructureNote = `
    The response MUST be a valid JSON array of objects. Each object in the array must strictly follow this structure:
    {
      "passageText": "Optional. Text of a passage or context that precedes the question in ${targetLanguage}. Can contain simple HTML like <p> or <table>.",
      "questionText": "The full text of the question in ${targetLanguage}, following any passage. Can contain simple HTML like <p> or <table>. For 'Match the Following' questions, include lists and codes here as described below.",
      "options": ["Option A in ${targetLanguage}", "Option B in ${targetLanguage}", "Option C in ${targetLanguage}", "Option D in ${targetLanguage}"],
      "correctAnswerIndex": 0 
    }
    CRITICAL JSON FORMATTING RULES:
    1.  Ensure 'correctAnswerIndex' is a number between 0 and 3.
    2.  The 'options' array MUST contain exactly 4 distinct string elements.
    3.  Each string element within the 'options' array (e.g., "Option A") MUST be fully enclosed in double quotes (e.g., "Correctly quoted option").
    4.  After the closing square bracket ']' of the 'options' array:
        - There MUST be a comma ',' immediately after the ']'. Example: "options": ["A", "B", "C", "D"], "correctAnswerIndex": 0
        - There should be NO other characters (like an extra quote or space) between the ']' and the subsequent comma or closing brace '}'.
    5.  All string values (for 'passageText', 'questionText', and in the 'options' array) MUST be correctly enclosed in double quotes.
    6.  Commas are CRITICAL for separating elements in arrays and key-value pairs in objects. Do not place a comma after the last element in an array or the last key-value pair in an object.
    7.  The 'passageText' and 'questionText' can include simple HTML for formatting, such as "<p>" tags for paragraphs, and "<table>", "<thead>", "<tbody>", "<tr>", "<th>", "<td>" tags for tables, if the content requires it. Ensure any HTML is well-formed and properly escaped within the JSON string.
    8.  Do not include ANY introductory text, explanations, or any characters outside the main JSON array itself. The entire response should be ONLY the JSON array.
    9.  For "Match the Following" type questions, structure the \`questionText\` using HTML for proper formatting.
        - The \`questionText\` should contain all introductory text (e.g., "Match LIST-I with LIST-II"), the matching table itself, and any concluding text (e.g., "Choose the correct answer...").
        - The matching table MUST be a valid HTML \`<table>\`.
        - The table should have a \`<thead>\` with a \`<tr>\` containing two \`<th>\` elements for the list headers (e.g., "LIST-I (Type of Sampling)" and "LIST-II (Statement)").
        - The \`<tbody>\` should contain \`<tr>\` elements for each pair of items. Each row must have two \`<td>\` elements, one for each list's item.
        - **Crucially, do NOT use the text-based \`\\\\n\` separation format for these questions.** Generate a full, well-formed HTML table within the \`questionText\` string.
        - Example \`questionText\` structure: "Match LIST-I with LIST-II <table><thead><tr><th>LIST-I...</th><th>LIST-II...</th></tr></thead><tbody><tr><td>A. Item...</td><td>I. Statement...</td></tr>...</tbody></table> Choose the correct answer..."
        - The \`options\` array should contain the corresponding answer choices, like ["1. A-IV, B-II, C-I, D-III", "2. A-II, B-IV, C-III, D-I", ...].
  `;

  if (numQuestions === NUM_QUESTIONS_AI_DECIDES && inputType === TestInputMethod.DOCUMENT) {
    prompt = `
    You are an expert multilingual test creator. Based on the following document content:
    ---
    ${content}
    ---
    ${documentProcessingInstructions}
    Extract ALL identifiable unique multiple-choice questions from the provided document content in ${targetLanguage}. This includes standard multiple-choice questions, questions with HTML tables or paragraphs, "Match the Following" type questions, and questions preceded by a contextual passage.
    ${jsonStructureNote}
  `;
  } else {
    prompt = `
    You are an expert multilingual test creator. Based on the following ${inputType} content:
    ---
    ${content}
    ---
    ${documentProcessingInstructions}
    Generate EXACTLY ${numQuestions > 0 ? numQuestions : DEFAULT_NUM_QUESTIONS} unique multiple-choice questions. This includes standard multiple-choice questions, questions with HTML tables or paragraphs, "Match the Following" type questions, and questions preceded by a contextual passage, if appropriate for the content.
    ${jsonStructureNote}
  `;
  }

  try {
    const response: GenerateContentResponse = await aiInstance.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3, 
      },
    });

    const generatedPayload = parseJsonFromMarkdown<GeneratedQuestionPayload[]>(response.text);

    if (!generatedPayload || !Array.isArray(generatedPayload)) {
      throw new Error("AI did not return valid question data. The response was not a JSON array.");
    }
    
    if (generatedPayload.length === 0 && (numQuestions > 0 || numQuestions === NUM_QUESTIONS_AI_DECIDES) ) { 
       throw new Error(`AI returned an empty list of questions. This might be because no questions were identifiable in the provided content (especially for PDFs where we tried to extract all), no content matched the selected language (${targetLanguage}), or the combination of topic/syllabus and difficulty yielded no results. Please check your input or try different settings.`);
    }

    return generatedPayload.map((q, index) => ({
      id: `q-${Date.now()}-${index}`,
      passageText: q.passageText,
      questionText: q.questionText,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex,
      status: QuestionStatus.UNVISITED,
    }));

  } catch (error) {
    console.error("Error generating questions:", error);
    if (error instanceof Error) {
        // The error from the SDK might already contain a JSON string in its message.
        // We'll pass it along to be displayed to the user.
        throw new Error(`Failed to generate questions: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating questions.");
  }
};

export const extractTextFromInlineData = async (base64Data: string, mimeType: string): Promise<string> => {
  const aiInstance = getAi();
  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64Data,
    },
  };
  const textPart = {
    text: "Extract all text from this document/image. Respond with only the extracted text. If the document is primarily in a non-English language (e.g., Hindi), extract the text in that language."
  };

  try {
    const response: GenerateContentResponse = await aiInstance.models.generateContent({
      model: GEMINI_TEXT_MODEL, 
      contents: { parts: [imagePart, textPart] },
    });
    return response.text;
  } catch (error) {
    console.error("Error extracting text from inline data:", error);
    if (error instanceof Error && error.message.includes('400 Bad Request')) {
      throw new Error("The uploaded file could not be processed by the AI. It might be corrupted, too large, or an unsupported variation of the MIME type. Please try a different file.");
    }
    throw new Error("Failed to extract text using AI.");
  }
};

export const generateExplanationForQuestion = async (question: Question): Promise<string> => {
  const aiInstance = getAi();
  
  const prompt = `
    You are an expert tutor. For the following multiple-choice question:
    ---
    ${question.passageText ? `Passage/Context:\n${question.passageText}\n---\n` : ''}
    Question: ${question.questionText}
    Options:
    ${question.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}
    Correct Answer: ${String.fromCharCode(65 + question.correctAnswerIndex)}. ${question.options[question.correctAnswerIndex]}
    ${question.userAnswerIndex !== undefined ? `User's Answer: ${String.fromCharCode(65 + question.userAnswerIndex)}. ${question.options[question.userAnswerIndex]}` : "User did not answer."}
    ---
    Provide a concise and clear explanation for why the correct answer is correct. 
    If the user answered, and their answer was incorrect, also briefly explain why their chosen answer is incorrect.
    Focus on being helpful and educational. Keep the explanation to a few sentences.
    Do not repeat the question or options in your explanation unless absolutely necessary for clarity.
    The explanation should be in the same language as the question if possible, otherwise English.
  `;

  try {
    const response: GenerateContentResponse = await aiInstance.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.2,
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error generating explanation:", error);
    if (error instanceof Error && error.message.includes("429")) { // Specific check for rate limit
      throw new Error("Explanation generation failed due to API rate limits. Please try again later.");
    }
    throw new Error("Failed to generate explanation using AI.");
  }
};


export const getGeminiFollowUpChat = (question: Question, explanation?: string): Chat => {
  const aiInstance = getAi();
  const explanationText = explanation
    ? `Explanation: ${explanation}`
    : "An official explanation has not been provided or generated for this question yet. Based on the question and the correct answer, please assist the user.";

  const history = [
    {
      role: "user",
      parts: [{text: `
        The user is asking a follow-up question about the following multiple-choice question and its official explanation (if provided).
        ---
        ${question.passageText ? `Passage/Context:\n${question.passageText}\n---\n` : ''}
        Question: ${question.questionText}
        Options:
        ${question.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}
        Correct Answer: ${String.fromCharCode(65 + question.correctAnswerIndex)}. ${question.options[question.correctAnswerIndex]}
        ${explanationText}
        ---
        This is the context. The user's next message will be their actual question.
      `}]
    },
    {
      role: "model",
      parts: [{text: "Context understood. I am ready to answer the user's follow-up question as Elsa."}]
    }
  ];

  const chat: Chat = aiInstance.chats.create({
    model: GEMINI_TEXT_MODEL,
    history: history,
    config: {
      temperature: 0.5,
      systemInstruction: `You are Elsa, a helpful AI assistant.
      Your personality is that of a razor-sharp thinker and natural strategist, known for your ability to solve complex problems, speak with clarity, and stay composed under pressure. You value truth, elegance, and independence. You are brilliant, but also grounded, kind, and trustworthy.

      When the user asks for clarification on a test question, provide clear, concise, and accurate answers that reflect this personality.
      - Use markdown for formatting when it enhances clarity (e.g., **bold** for emphasis, *italics* for terms, and bulleted lists using '*' or '-'). Each list item must be on a new line.
      - Stick to the context of the original question. Avoid introducing new topics unless directly relevant.
      - If a user's follow-up seems to misunderstand, gently guide them back to the core concepts.
      - Keep responses brief and to the point.
      - Do not offer to change the original question's correct answer. You are here to explain and clarify.
      `
    }
  });
  return chat;
};
