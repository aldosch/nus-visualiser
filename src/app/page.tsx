import { FlowDiagram } from "@/components/flow-diagram";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[var(--flow-agent)]" />
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            nus agent · data flow
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          How the weather agent works
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          An illustrative walkthrough of a single request — &ldquo;What&rsquo;s
          the weather in Singapore?&rdquo; — as it travels from a channel into
          the agent, calls a tool through a workflow and Vercel Function,
          reaches the meteoblue API, and streams an answer back. The model is
          reached through the Vercel AI Gateway.
        </p>
      </header>

      <FlowDiagram />
    </main>
  );
}
