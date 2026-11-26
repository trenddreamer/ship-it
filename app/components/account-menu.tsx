// The account menu at the end of the header: a person icon that opens a
// panel with who is signed in, their Account type, and Sign out. A click
// outside it or Esc closes it.
import { useEffect, useId, useRef, useState } from "react";
import { Form } from "react-router";
import { PersonIcon } from "~/components/nav-icons";

export function AccountMenu({ email, kindName }: { email: string; kindName: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        aria-controls={panelId}
        title={email}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className="flex rounded-full p-2 hover:bg-line aria-expanded:bg-line"
      >
        <PersonIcon />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute right-0 top-full z-10 mt-2 w-64 rounded-lg border border-line bg-raised p-1 shadow-lg"
      >
        <div className="px-3 py-2">
          <p className="truncate font-medium" title={email}>
            {email}
          </p>
          <p className="text-sm text-muted">{kindName}</p>
        </div>
        <hr className="my-1 border-line" />
        <Form method="post" action="/sign-out">
          <button type="submit" className="w-full rounded px-3 py-2 text-left hover:bg-line">
            Sign out
          </button>
        </Form>
      </div>
    </div>
  );
}
