import Link from "next/link";

export function BackLink({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const q = new URLSearchParams();
  const provider = searchParams.provider;
  const txt = searchParams.q;
  const sort = searchParams.sort;
  if (typeof provider === "string") q.set("provider", provider);
  if (typeof txt === "string") q.set("q", txt);
  if (typeof sort === "string") q.set("sort", sort);
  const href = q.toString()
    ? `/manage/models?${q.toString()}`
    : "/manage/models";
  return (
    <Link href={href} className="text-sm text-primary hover:underline">
      ← Back to models
    </Link>
  );
}
