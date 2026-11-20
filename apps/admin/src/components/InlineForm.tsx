import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "./ui";

/** Bitta maydonli qo'shish yoki nomini o'zgartirish formasi */
export function InlineForm(props: {
  label: string;
  placeholder: string;
  initial?: string;
  busy?: boolean;
  onSubmit: (value: string) => void;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState(props.initial ?? "");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) props.onSubmit(value.trim());
  };
  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={props.placeholder}
        aria-label={props.placeholder}
        maxLength={200}
        className="min-h-11 min-w-0 flex-1 rounded-xl border border-hint/25 bg-section px-3 text-sm"
      />
      <Button type="submit" busy={props.busy} disabled={!value.trim()}>
        {!props.initial && <Plus size={16} />} {props.label}
      </Button>
      {props.onCancel && (
        <Button variant="ghost" onClick={props.onCancel}>
          Bekor
        </Button>
      )}
    </form>
  );
}
