import { FlowDiagram } from "@/components/flow-diagram";

function VercelMark() {
  return (
    <svg
      role="img"
      aria-label="Vercel"
      height={18}
      viewBox="0 0 76 65"
      fill="none"
      className="text-foreground"
    >
      <title>Vercel</title>
      <path d="M37.59.25l36.95 64H.64l36.95-64z" fill="currentColor" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="min-h-dvh">
      <nav className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-6">
          <div className="flex items-center gap-2.5">
            <VercelMark />
            <span className="h-4 w-px bg-border" />
            <span className="font-mono text-[13px] font-medium text-foreground">
              nus agent · flow
            </span>
          </div>
        </div>
      </nav>

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-14">
        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[var(--flow-agent)]" />
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              nus agent · data flow
            </span>
          </div>
          <h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
            How the weather agent works
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
            An illustrative walkthrough of a single request &mdash;
            &ldquo;What&rsquo;s the weather in Singapore?&rdquo; &mdash; as it
            travels from a channel into the agent, calls a tool through a
            workflow and Vercel Function, reaches the meteoblue API, and streams
            an answer back. The model is reached through the Vercel AI Gateway.
          </p>
        </header>

        <FlowDiagram />

        <footer className="flex flex-col gap-2 border-t border-border pt-6 text-muted-foreground text-xs">
          <p>
            Live: the nus weather agent, a web chat, and Slack, each deployed to
            production on Vercel.
          </p>
          <p>
            Vercel proof of concept. Forecasts are sourced from the meteoblue
            API.
          </p>
        </footer>
      </main>
    </div>
  );
}
