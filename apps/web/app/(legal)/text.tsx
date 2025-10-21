import { type PropsWithChildren } from "react";

export function SectionHeader({
  children,
  num,
}: PropsWithChildren & { num: number | null }) {
  return (
    <a id={num ? num.toString() : undefined}>
      <h2 className="text-2xl font-semibold tracking-tight mt-6">
        {num ? num + ". " : ""}
        {children}
      </h2>
    </a>
  );
}

export function SectionSubheader({ children }: PropsWithChildren) {
  return (
    <h3 className="text-xl font-semibold tracking-tight mt-6">{children}</h3>
  );
}

export function ItemList({ children }: PropsWithChildren) {
  return <ul className="list-disc mt-2 pl-6 space-y-1">{children}</ul>;
}
