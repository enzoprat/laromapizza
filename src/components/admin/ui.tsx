"use client";

import { useFormStatus } from "react-dom";
import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Section({
  title,
  description,
  children,
  aside,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-ink-soft">{description}</p> : null}
        </div>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Field({
  label,
  name,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; hint?: string }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-ink-soft">
        {label}
      </label>
      <input id={name} name={name} className="field" {...props} />
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function TextArea({
  label, name, hint, ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string; hint?: string }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</label>
      <textarea
        id={name}
        name={name}
        rows={3}
        className="w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink transition-colors focus:border-rosso-600 focus:outline-none focus:ring-2 focus:ring-rosso-600/15"
        {...props}
      />
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export function Toggle({
  label, name, defaultChecked, hint,
}: {
  label: string; name: string; defaultChecked?: boolean; hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white px-4 py-3 transition-colors hover:bg-sand/50">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-5 shrink-0 accent-basil-600"
      />
      <span>
        <span className="block text-[15px] font-semibold text-ink">{label}</span>
        {hint ? <span className="block text-xs text-ink-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

export function SubmitButton({ children, className }: { children?: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={cn("btn-primary btn-md", className)}>
      {pending ? "Enregistrement…" : (children ?? "Enregistrer")}
    </button>
  );
}

export function StatusMessage({ state }: { state: { ok?: string; error?: string } }) {
  if (!state.ok && !state.error) return null;
  const isError = Boolean(state.error);
  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium",
        isError ? "bg-rosso-50 text-rosso-700" : "bg-basil-50 text-basil-700",
      )}
    >
      {isError ? <AlertCircle className="size-4 shrink-0" aria-hidden /> : <Check className="size-4 shrink-0" aria-hidden />}
      {state.error ?? state.ok}
    </p>
  );
}
