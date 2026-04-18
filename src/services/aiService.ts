import OpenAI from "openai";
import { knownSpecialties } from "../lib/openai";
import type {
  AIIntakeResult,
  AnalyzeSymptomsInput,
  UrgencyLevel,
} from "../types/ai";

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

const systemPrompt = `You are an AI intake routing assistant for a hospital kiosk in India.
Your job is to analyze the complete intake context, summarize the patient's concern, choose the safest hospital specialty, and assign routing urgency.

Non-negotiable safety rules:
- Do not diagnose. Do not say the patient has a disease with certainty.
- Do not prescribe medicines, tests, home remedies, or treatment.
- Do not invent symptoms, duration, severity, age, gender, pregnancy, injuries, or red flags that are not present in the intake.
- If information is missing, say it is not provided instead of guessing.
- If the complaint is vague, route conservatively to the safest reasonable specialty.
- Return structured JSON only with exactly these keys: symptom_summary, recommended_specialty, urgency_level, reasoning.

Analyze every available aspect before deciding:
1. Patient context: age and gender if provided.
2. Main symptom: what the patient is actually complaining of.
3. Body system or location: stomach, chest, breathing, skin, joints, ear/nose/throat, neurological, reproductive, urinary, etc.
4. Duration and progression: sudden, persistent, worsening, recurrent, or not provided.
5. Severity words: severe, unbearable, mild, repeated, continuous, unable to walk/eat/breathe, etc.
6. Associated symptoms: fever, cough, pain, vomiting, diarrhea, dizziness, weakness, bleeding, rash, injury, pregnancy-related symptoms, etc.
7. Red flags: chest pain, severe breathlessness, fainting, seizure, stroke-like weakness, blood in vomit/stool, severe abdominal pain, dehydration, very high fever, confusion, or severe injury.
8. Language meaning: interpret Hindi, English, and Hinglish literally before routing.

Hindi and Hinglish interpretation:
- Patients may type Roman Hindi, Hindi script, English, or mixed language.
- First understand the literal patient meaning, then route. Do not convert Hindi/Hinglish words into unrelated English medical terms.
- "ulti", "ultee", "ulati", "ulti ho rahi hai", "ulti ho rahi h", "ulti aa rahi hai", "उल्टी", "उलटी", "matli", "मतली", "nausea", and "vomiting" mean vomiting or nausea. They do NOT mean urination.
- Only treat a complaint as urinary if the patient mentions "urine", "urination", "urinary", "peshab", "पेशाब", "jalan while urinating", "burning urine", "urine infection", or equivalent wording.
- Common terms: "bukhar/बुखार" = fever, "khansi/खांसी" = cough, "saans/सांस/साँस" = breathing, "pet dard/पेट दर्द" = stomach pain, "sir dard/सिर दर्द" = headache, "dast/दस्त" or "loose motion" = diarrhea, "chakkar/चक्कर" = dizziness, "jalan/जलन" = burning sensation.

Specialty routing:
- General Medicine: fever, weakness, body ache, vague multisystem symptoms, general viral-like illness, or unclear non-emergency complaints.
- Gastroenterology: vomiting, nausea, loose motion, diarrhea, stomach pain, acidity, digestion, constipation, blood in stool unless another emergency route is safer.
- Pulmonology: cough, breathing trouble, wheezing, asthma-like symptoms, chest congestion.
- Cardiology: chest pain, palpitations, fainting with chest symptoms, suspected heart-related complaints.
- Neurology: seizure, severe headache with neuro symptoms, one-sided weakness, confusion, dizziness with neurologic signs.
- Gynecology: pregnancy, menstrual, vaginal, pelvic, or reproductive complaints.
- Orthopedics: bone, joint, muscle, back, knee, fracture, sprain, injury, movement pain.
- Dermatology: skin rash, itching, acne, wounds, visible skin infection, allergy on skin.
- ENT: ear, nose, throat, tonsil, hearing, sinus, voice complaints.
- Pediatrics: child patient complaints when age indicates a child and no more specific specialty is safer.

Urgency routing:
- high: emergency red flags, chest pain, severe breathlessness, stroke-like symptoms, seizure, unconsciousness, severe dehydration, blood in vomit/stool, severe abdominal pain, severe injury, or rapidly worsening symptoms.
- medium: persistent vomiting, repeated diarrhea, moderate breathing symptoms, significant pain, fever with worsening symptoms, pregnancy-related symptoms, or symptoms that need same-day clinician review.
- low: mild, stable, non-emergency symptoms without red flags.

Output requirements:
- recommended_specialty must be one of: ${knownSpecialties.join(", ")}.
- urgency_level must be one of: low, medium, high.
- symptom_summary should be patient-friendly and mention key provided details only.
- reasoning should briefly state the important aspects considered: symptom meaning, relevant context, red flags if present, specialty choice, and urgency. Keep it concise and do not diagnose.`;

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

function getSymptomInterpretationHints(symptomInput: string) {
  const normalized = symptomInput.toLowerCase();
  const hints: string[] = [];

  if (
    /\b(ulti|ultee|ulati|matli|vomit|vomiting|nausea)\b/.test(normalized) ||
    /(उल्टी|उलटी|मतली)/.test(symptomInput)
  ) {
    hints.push(
      "The patient text contains a vomiting/nausea term. Interpret this as vomiting or nausea, not urination.",
    );
  }

  if (
    /\b(urine|urination|urinary|peshab)\b/.test(normalized) ||
    /पेशाब/.test(symptomInput)
  ) {
    hints.push(
      "The patient text explicitly contains a urine-related term, so urinary routing may be considered if clinically appropriate.",
    );
  }

  return hints;
}

function formatPatientContext({
  age,
  gender,
}: Pick<AnalyzeSymptomsInput, "age" | "gender">) {
  return [
    `Age: ${age === undefined || age === "" ? "not provided" : age}`,
    `Gender: ${gender?.trim() ? gender.trim() : "not provided"}`,
  ].join("\n");
}

export async function analyzeSymptoms({
  symptomInput,
  age,
  gender,
}: AnalyzeSymptomsInput): Promise<AIIntakeResult> {
  const trimmedSymptoms = symptomInput.trim();

  if (!trimmedSymptoms) {
    throw new Error("Symptom input is required before AI analysis.");
  }

  try {
    const openai = createOpenAIClient();
    const interpretationHints = getSymptomInterpretationHints(trimmedSymptoms);
    const response = await openai.responses.create({
      model: import.meta.env.VITE_OPENAI_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            "Analyze this hospital intake context literally and safely.",
            "Patient context:",
            formatPatientContext({ age, gender }),
            `Raw patient symptom text: ${trimmedSymptoms}`,
            interpretationHints.length > 0
              ? `Interpreter notes: ${interpretationHints.join(" ")}`
              : "Interpreter notes: No extra hints detected. Do not invent symptoms.",
          ].join("\n"),
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
      temperature: 0.1,
    });

    if (!response.output_text) {
      throw new Error("AI returned no readable analysis.");
    }

    return parseAIResult(response.output_text);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
