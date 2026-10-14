"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-line bg-panel shadow-panel px-4 sm:px-5 py-12 sm:items-center sm:py-16 sm:text-center">
      <span className="scoreboard whitespace-nowrap text-[40px] font-semibold leading-none text-crest">Faul</span>
      <h1 className="font-display text-[24px] font-semibold leading-tight tracking-[-0.03em]">Podaci se nisu učitali</h1>
      <p className="max-w-sm text-[15px] text-fg-muted">Provjeri internet vezu i pokušaj ponovo. Ako se ponavlja, javi savezu.</p>
      <Button onClick={reset} className="mt-2 w-full sm:w-auto">
        <RotateCw className="size-4" /> Pokušaj ponovo
      </Button>
    </div>
  );
}
