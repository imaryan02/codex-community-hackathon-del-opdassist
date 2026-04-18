export const knownSpecialties = [
  "General Medicine",
  "Gastroenterology",
  "Gynecology",
  "Orthopedics",
  "Dermatology",
  "ENT",
  "Pediatrics",
  "Cardiology",
  "Neurology",
  "Pulmonology",
] as const;

export type KnownSpecialty = (typeof knownSpecialties)[number];
