import { AuthCard } from "../auth-card";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Zaboravljena šifra — KSKS" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Zaboravljena šifra" subtitle="Upiši email s kojim se prijavljuješ. Poslat ćemo ti link za novu šifru.">
      <ForgotForm />
    </AuthCard>
  );
}
