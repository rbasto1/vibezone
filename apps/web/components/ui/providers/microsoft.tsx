import type { ComponentProps } from "react";

export default function MicrosoftIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>Microsoft</title>
      <path d="M11.49 2H2v9.492h9.492V2h-.002z" fill="#00FF41"></path>
      <path d="M22 2h-9.492v9.492H22V2z" fill="#00FF41"></path>
      <path d="M11.49 12.508H2V22h9.492v-9.492h-.002z" fill="#00FF41"></path>
      <path d="M22 12.508h-9.492V22H22v-9.492z" fill="#00FF41"></path>
    </svg>
  );
}
