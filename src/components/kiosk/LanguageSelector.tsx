type LanguageSelectorProps = {
  value?: "en" | "hi";
  onChange?: (language: "en" | "hi") => void;
};

const languages = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी" },
] as const;

export function LanguageSelector({
  value = "en",
  onChange,
}: LanguageSelectorProps) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
      {languages.map((language) => (
        <button
          key={language.value}
          type="button"
          onClick={() => onChange?.(language.value)}
          className={[
            "min-h-12 rounded-xl px-4 text-sm font-bold transition",
            value === language.value
              ? "bg-brand-700 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100",
          ].join(" ")}
        >
          {language.label}
        </button>
      ))}
    </div>
  );
}
