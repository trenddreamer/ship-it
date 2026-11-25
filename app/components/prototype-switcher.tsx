// PROTOTYPE, throwaway: the floating bar that flips between UI prototype
// variants via `?variant=`. Never rendered in a production build.
import { useEffect, type ReactNode } from "react";
import { useSearchParams } from "react-router";

export type PrototypeVariant = { key: string; name: string };

export function usePrototypeVariant(variants: PrototypeVariant[]) {
  const [searchParams] = useSearchParams();
  const asked = searchParams.get("variant");
  return variants.some((v) => v.key === asked) ? asked! : variants[0]!.key;
}

export function PrototypeSwitcher({
  variants,
  current,
  children,
}: {
  variants: PrototypeVariant[];
  current: string;
  /** The state to show under the label, so you can see what changed. */
  children?: ReactNode;
}) {
  const [, setSearchParams] = useSearchParams();
  const index = variants.findIndex((v) => v.key === current);

  function go(step: number) {
    const next = variants[(index + step + variants.length) % variants.length]!;
    setSearchParams(
      (params) => {
        params.set("variant", next.key);
        return params;
      },
      { replace: true, preventScrollReset: true },
    );
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!import.meta.env.DEV) return null;

  const arrow = { padding: "0.25rem 0.75rem", fontSize: "1.25rem", lineHeight: 1 };
  return (
    <div
      style={{
        position: "fixed",
        bottom: "1rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: "0.25rem",
        padding: "0.375rem 0.5rem",
        borderRadius: "9999px",
        background: "#6d28d9",
        color: "#ffffff",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        fontFamily: "ui-monospace, monospace",
        fontSize: "0.8rem",
        colorScheme: "only light",
      }}
    >
      <button type="button" onClick={() => go(-1)} style={arrow} aria-label="Previous variant">
        ←
      </button>
      <div style={{ textAlign: "center", minWidth: "17rem" }}>
        <div style={{ fontWeight: 700 }}>
          {current} ({variants[index]!.name})
        </div>
        {children && <div style={{ opacity: 0.85 }}>{children}</div>}
      </div>
      <button type="button" onClick={() => go(1)} style={arrow} aria-label="Next variant">
        →
      </button>
    </div>
  );
}
