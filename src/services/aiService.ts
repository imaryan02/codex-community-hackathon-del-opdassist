import OpenAI from "openai";
import { knownSpecialties } from "../lib/openai";
import type { AIIntakeResult, AnalyzeSymptomsInput, UrgencyLevel } from "../types/ai";

const urgencyLevels: UrgencyLevel[] = ["low", "medium", "high"];

const intakeResponseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    symptom_summary: {
      type: "string",
      description: "Brief patient-friendly summary of the reported symptoms.",
    },
    recommended_specialty: {
      type: "string",
      enum: knownSpecialties,
      description: "Best routing specialty from the approved list only.",
    },
    urgency_level: {
      type: "string",
      enum: urgencyLevels,
      description: "Routing urgency for queue awareness.",
    },
    reasoning: {
      type: "string",
      description:
        "Short routing reason without definitive diagnosis or treatment advice.",
    },
  },
  required: [
    "symptom_summary",
    "recommended_specialty",
    "urgency_level",
    "reasoning",
  ],
} as const;

const systemPrompt = `You are an AI intake routing assistant for a hospital MVP.
Your only job is to summarize symptoms and route the patient to one hospital specialty.
Do not provide a definitive diagnosis.
Do not prescribe treatment.
Do not mention conditions as certain.
Return structured JSON only with exactly these keys:
symptom_summary, recommended_specialty, urgency_level, reasoning.
recommended_specialty must be one of:
${knownSpecialties.join(", ")}.
urgency_level must be one of: low, medium, high.
Keep the summary and reasoning short, clear, and suitable for a doctor's queue.`;

function createOpenAIClient() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OpenAI API key is missing. Add VITE_OPENAI_API_KEY to your environment.",
    );
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
}

function parseAIResult(rawText: string): AIIntakeResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("AI returned a response that could not be parsed.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI returned an empty or invalid response.");
  }

  const candidate = parsed as Partial<AIIntakeResult>;

  if (
    typeof candidate.symptom_summary !== "string" ||
    typeof candidate.recommended_specialty !== "string" ||
    typeof candidate.urgency_level !== "string" ||
    typeof candidate.reasoning !== "string"
  ) {
    throw new Error("AI response was missing one or more required fields.");
  }

  if (!knownSpecialties.includes(candidate.recommended_specialty)) {
    throw new Error("AI returned a specialty outside the approved list.");
  }

  if (!urgencyLevels.includes(candidate.urgency_level as UrgencyLevel)) {
    throw new Error("AI returned an unsupported urgency level.");
  }

  return {
    symptom_summary: candidate.symptom_summary.trim(),
    recommended_specialty: candidate.recommended_specialty,
    urgency_level: candidate.urgency_level as UrgencyLevel,
    reasoning: candidate.reasoning.trim(),
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "AI analysis failed. Please try again.";
}

export async function analyzeSymptoms({
  symptomInput,
}: AnalyzeSymptomsInput): Promise<AIIntakeResult> {
  const trimmedSymptoms = symptomInput.trim();

  if (!trimmedSymptoms) {
    throw new Error("Symptom input is required before AI analysis.");
  }

  try {
    const openai = createOpenAIClient();
    const response = await openai.responses.create({
      model: import.meta.env.VITE_OPENAI_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Patient symptom input: ${trimmedSymptoms}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "hospital_intake_analysis",
          strict: true,
          schema: intakeResponseSchema,
        },
      },
      temperature: 0.2,
    });

    if (!response.output_text) {
      throw new Error("AI returned no readable analysis.");
    }

    return parseAIResult(response.output_text);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
