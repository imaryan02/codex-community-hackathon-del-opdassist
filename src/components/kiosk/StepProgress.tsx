type StepProgressProps = {
  steps: string[];
  currentStep: number;
};

export function StepProgress({ steps, currentStep }: StepProgressProps) {
  return (
    <ol className="grid gap-2 sm:grid-cols-5">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isComplete = stepNumber < currentStep;

        return (
          <li
            key={step}
            className={[
              "rounded-2xl border p-3 transition",
              isActive
                ? "border-brand-600 bg-brand-700 text-white shadow-sm"
                : isComplete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-500",
            ].join(" ")}
          >
            <p className="text-xs font-bold uppercase tracking-wide">
              Step {stepNumber}
            </p>
            <p className="mt-1 text-sm font-bold">{step}</p>
          </li>
        );
      })}
    </ol>
  );
}
