"use client";

import {
  Bot,
  Cloud,
  MessageSquare,
  MonitorSmartphone,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------
const VB = { w: 1040, h: 460 };

type NodeId =
  | "web"
  | "slack"
  | "agent"
  | "gateway"
  | "workflow"
  | "tool"
  | "meteoblue";

interface FlowNode {
  id: NodeId;
  label: string;
  sublabel: string;
  icon: typeof Bot;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const N_W = 150;
const N_H = 74;

// Columns
const COL_CHANNEL = 30;
const COL_AGENT = 300;
const COL_INTERNAL = 560;
const COL_EXTERNAL = 850;

const NODES: FlowNode[] = [
  {
    id: "web",
    label: "nus-frontend",
    sublabel: "web chat",
    icon: MonitorSmartphone,
    color: "var(--flow-web)",
    x: COL_CHANNEL,
    y: 70,
    w: N_W,
    h: N_H,
  },
  {
    id: "slack",
    label: "Slack",
    sublabel: "Vercel Connect",
    icon: MessageSquare,
    color: "var(--flow-slack)",
    x: COL_CHANNEL,
    y: 300,
    w: N_W,
    h: N_H,
  },
  {
    id: "agent",
    label: "nus-agent",
    sublabel: "eve · Claude Sonnet",
    icon: Bot,
    color: "var(--flow-agent)",
    x: COL_AGENT,
    y: 193,
    w: N_W,
    h: N_H,
  },
  {
    id: "gateway",
    label: "AI Gateway",
    sublabel: "model routing",
    icon: Sparkles,
    color: "var(--flow-gateway)",
    x: COL_INTERNAL,
    y: 40,
    w: N_W,
    h: N_H,
  },
  {
    id: "workflow",
    label: "Workflow",
    sublabel: "get_weather",
    icon: Workflow,
    color: "var(--flow-workflow)",
    x: COL_INTERNAL,
    y: 193,
    w: N_W,
    h: N_H,
  },
  {
    id: "tool",
    label: "Vercel Function",
    sublabel: "tool execution",
    icon: Zap,
    color: "var(--flow-fn)",
    x: COL_INTERNAL,
    y: 346,
    w: N_W,
    h: N_H,
  },
  {
    id: "meteoblue",
    label: "meteoblue API",
    sublabel: "forecast (signed)",
    icon: Cloud,
    color: "var(--flow-api)",
    x: COL_EXTERNAL,
    y: 346,
    w: N_W,
    h: N_H,
  },
];

function node(id: NodeId): FlowNode {
  // biome-ignore lint/style/noNonNullAssertion: ids are static and known
  return NODES.find((n) => n.id === id)!;
}

interface BoundaryDef {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  inner?: boolean;
}

// Vercel boundary wraps the agent + its internals.
const VERCEL_X = COL_AGENT - 26;
const VERCEL_RIGHT = COL_INTERNAL + N_W + 26;
const AGENT_X = COL_INTERNAL - 16;
const AGENT_RIGHT = COL_INTERNAL + N_W + 16;

const BOUNDARIES: BoundaryDef[] = [
  {
    label: "VERCEL",
    x: VERCEL_X,
    y: 8,
    w: VERCEL_RIGHT - VERCEL_X,
    h: VB.h - 40,
  },
  {
    label: "nus-agent internals",
    x: AGENT_X,
    y: 22,
    w: AGENT_RIGHT - AGENT_X,
    h: VB.h - 66,
    inner: true,
  },
];

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------
type Side = "left" | "right" | "top" | "bottom";

function anchor(n: FlowNode, side: Side): { x: number; y: number } {
  switch (side) {
    case "left":
      return { x: n.x, y: n.y + n.h / 2 };
    case "right":
      return { x: n.x + n.w, y: n.y + n.h / 2 };
    case "top":
      return { x: n.x + n.w / 2, y: n.y };
    case "bottom":
      return { x: n.x + n.w / 2, y: n.y + n.h };
  }
}

function curve(
  from: FlowNode,
  fromSide: Side,
  to: FlowNode,
  toSide: Side,
): string {
  const a = anchor(from, fromSide);
  const b = anchor(to, toSide);
  const midX = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x} ${b.y}`;
}

interface Conn {
  id: string;
  d: string;
}

const CONNECTIONS: Conn[] = [
  { id: "web-agent", d: curve(node("web"), "right", node("agent"), "left") },
  {
    id: "slack-agent",
    d: curve(node("slack"), "right", node("agent"), "left"),
  },
  {
    id: "agent-gateway",
    d: curve(node("agent"), "right", node("gateway"), "left"),
  },
  {
    id: "agent-workflow",
    d: curve(node("agent"), "right", node("workflow"), "left"),
  },
  {
    id: "workflow-tool",
    d: curve(node("workflow"), "bottom", node("tool"), "top"),
  },
  {
    id: "tool-meteoblue",
    d: curve(node("tool"), "right", node("meteoblue"), "left"),
  },
];

function conn(id: string): Conn {
  // biome-ignore lint/style/noNonNullAssertion: ids are static and known
  return CONNECTIONS.find((c) => c.id === id)!;
}

// ---------------------------------------------------------------------------
// Choreography — a looping, illustrative request lifecycle.
// Each step lights nodes/connections and emits a flowing particle.
// ---------------------------------------------------------------------------
interface Step {
  caption: string;
  connId: string;
  color: string;
  reverse?: boolean;
  litNodes: NodeId[];
  litConns: string[];
  duration: number; // particle travel seconds
}

const STEPS: Step[] = [
  {
    caption: '"What\'s the weather in Singapore?" arrives from a channel',
    connId: "web-agent",
    color: "var(--flow-web)",
    litNodes: ["web", "agent"],
    litConns: ["web-agent"],
    duration: 0.9,
  },
  {
    caption: "nus-agent asks the model (via AI Gateway) what to do",
    connId: "agent-gateway",
    color: "var(--flow-agent)",
    litNodes: ["agent", "gateway"],
    litConns: ["agent-gateway"],
    duration: 0.85,
  },
  {
    caption: "Model decides to call the get_weather tool",
    connId: "agent-gateway",
    color: "var(--flow-gateway)",
    reverse: true,
    litNodes: ["agent", "gateway"],
    litConns: ["agent-gateway"],
    duration: 0.85,
  },
  {
    caption: "Agent invokes the get_weather workflow",
    connId: "agent-workflow",
    color: "var(--flow-agent)",
    litNodes: ["agent", "workflow"],
    litConns: ["agent-workflow"],
    duration: 0.85,
  },
  {
    caption: "Workflow runs the tool in a Vercel Function",
    connId: "workflow-tool",
    color: "var(--flow-workflow)",
    litNodes: ["workflow", "tool"],
    litConns: ["workflow-tool"],
    duration: 0.8,
  },
  {
    caption: "Function geocodes + signs a request to the meteoblue API",
    connId: "tool-meteoblue",
    color: "var(--flow-fn)",
    litNodes: ["tool", "meteoblue"],
    litConns: ["tool-meteoblue"],
    duration: 0.9,
  },
  {
    caption: "meteoblue returns the forecast",
    connId: "tool-meteoblue",
    color: "var(--flow-api)",
    reverse: true,
    litNodes: ["tool", "meteoblue"],
    litConns: ["tool-meteoblue"],
    duration: 0.9,
  },
  {
    caption: "Result flows back up through the workflow",
    connId: "workflow-tool",
    color: "var(--flow-fn)",
    reverse: true,
    litNodes: ["workflow", "tool"],
    litConns: ["workflow-tool"],
    duration: 0.8,
  },
  {
    caption: "Agent feeds the tool result back to the model",
    connId: "agent-workflow",
    color: "var(--flow-workflow)",
    reverse: true,
    litNodes: ["agent", "workflow"],
    litConns: ["agent-workflow"],
    duration: 0.8,
  },
  {
    caption: "Model writes a concise answer (via AI Gateway)",
    connId: "agent-gateway",
    color: "var(--flow-gateway)",
    reverse: true,
    litNodes: ["agent", "gateway"],
    litConns: ["agent-gateway"],
    duration: 0.85,
  },
  {
    caption: "Agent streams the answer back to the channel",
    connId: "web-agent",
    color: "var(--flow-agent)",
    reverse: true,
    litNodes: ["agent", "web"],
    litConns: ["web-agent"],
    duration: 0.9,
  },
];

const GAP_MS = 350; // pause between steps
const LOOP_PAUSE_MS = 1400; // pause before restarting the loop

interface ActiveParticle {
  id: string;
  connId: string;
  color: string;
  reverse: boolean;
  duration: number;
}

export function FlowDiagram() {
  const [stepIndex, setStepIndex] = useState(0);
  const [particles, setParticles] = useState<ActiveParticle[]>([]);
  const [litNodes, setLitNodes] = useState<Set<NodeId>>(new Set());
  const [litConns, setLitConns] = useState<Set<string>>(new Set());
  const seqRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let cancelled = false;
    const localTimers = timers.current;

    function schedule(fn: () => void, ms: number) {
      const t = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
      localTimers.push(t);
    }

    function runStep(i: number) {
      if (cancelled) return;
      const step = STEPS[i];
      setStepIndex(i);
      setLitNodes(new Set(step.litNodes));
      setLitConns(new Set(step.litConns));

      const id = `p${seqRef.current++}`;
      setParticles((prev) => [
        ...prev,
        {
          id,
          connId: step.connId,
          color: step.color,
          reverse: step.reverse ?? false,
          duration: step.duration,
        },
      ]);

      const next = i + 1;
      const wait = step.duration * 1000 + GAP_MS;
      if (next < STEPS.length) {
        schedule(() => runStep(next), wait);
      } else {
        schedule(() => {
          if (cancelled) return;
          setLitNodes(new Set());
          setLitConns(new Set());
        }, step.duration * 1000);
        schedule(() => runStep(0), wait + LOOP_PAUSE_MS);
      }
    }

    runStep(0);
    return () => {
      cancelled = true;
      for (const t of localTimers) clearTimeout(t);
      localTimers.length = 0;
    };
  }, []);

  const removeParticle = (id: string) =>
    setParticles((prev) => prev.filter((p) => p.id !== id));

  const current = STEPS[stepIndex];

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border bg-[var(--surface-raised)]">
        <svg
          viewBox={`0 0 ${VB.w} ${VB.h}`}
          className="h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="NUS agent data flow diagram"
        >
          <Boundaries />

          {CONNECTIONS.map((c) => (
            <ConnectionLine key={c.id} d={c.d} active={litConns.has(c.id)} />
          ))}

          <AnimatePresence>
            {particles.map((p) => (
              <Particle
                key={p.id}
                d={conn(p.connId).d}
                color={p.color}
                reverse={p.reverse}
                duration={p.duration}
                onDone={() => removeParticle(p.id)}
              />
            ))}
          </AnimatePresence>

          {NODES.map((n) => (
            <NodeView key={n.id} node={n} active={litNodes.has(n.id)} />
          ))}
        </svg>
      </div>

      {/* Caption / step strip */}
      <div className="flex items-center gap-3 rounded-lg border bg-[var(--surface-raised)] px-4 py-3">
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold"
          style={{
            background: current.color,
            color: "var(--flow-on-accent)",
          }}
        >
          {stepIndex + 1}
        </span>
        <AnimatePresence mode="wait">
          <motion.p
            key={stepIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-foreground"
          >
            {current.caption}
          </motion.p>
        </AnimatePresence>
        <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
          {stepIndex + 1} / {STEPS.length}
        </span>
      </div>

      <Legend />
    </div>
  );
}

function Boundaries() {
  return (
    <g>
      {BOUNDARIES.map((b) => {
        const fontSize = b.inner ? 9 : 10;
        const labelW = b.label.length * (b.inner ? 5.6 : 7.2) + 16;
        return (
          <g key={b.label}>
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx={b.inner ? 12 : 16}
              className={cn(
                "stroke-border",
                b.inner ? "fill-transparent" : "fill-muted/30",
              )}
              strokeWidth={1}
              strokeDasharray={b.inner ? "3 4" : "5 5"}
              strokeOpacity={b.inner ? 0.5 : 0.9}
            />
            <rect
              x={b.x + 14}
              y={b.y - 10}
              width={labelW}
              height={b.inner ? 18 : 20}
              rx={5}
              className="fill-background stroke-border"
              strokeWidth={1}
              strokeOpacity={b.inner ? 0.5 : 0.9}
            />
            <text
              x={b.x + 14 + labelW / 2}
              y={b.y + (b.inner ? 2.5 : 3)}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={fontSize}
              fontFamily="ui-monospace, monospace"
              letterSpacing={b.inner ? "0.04em" : "0.12em"}
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function ConnectionLine({ d, active }: { d: string; active: boolean }) {
  return (
    <motion.path
      d={d}
      fill="none"
      strokeLinecap="round"
      className={cn(!active && "stroke-border", active && "stroke-foreground")}
      animate={{
        strokeWidth: active ? 2 : 1,
        opacity: active ? 0.85 : 0.3,
      }}
      transition={{ duration: 0.25 }}
      strokeDasharray="2 7"
    />
  );
}

function Particle({
  d,
  color,
  reverse,
  duration,
  onDone,
}: {
  d: string;
  color: string;
  reverse: boolean;
  duration: number;
  onDone: () => void;
}) {
  return (
    <motion.circle
      r={5}
      style={{
        offsetPath: `path('${d}')`,
        fill: color,
        filter: `drop-shadow(0 0 6px ${color})`,
      }}
      initial={{ offsetDistance: reverse ? "100%" : "0%", opacity: 0 }}
      animate={{
        offsetDistance: reverse ? "0%" : "100%",
        opacity: [0, 1, 1, 0.9],
      }}
      transition={{ duration, ease: [0.4, 0, 0.2, 1] }}
      onAnimationComplete={onDone}
    />
  );
}

function NodeView({ node: n, active }: { node: FlowNode; active: boolean }) {
  const Icon = n.icon;
  return (
    <g>
      <motion.rect
        x={n.x}
        y={n.y}
        width={n.w}
        height={n.h}
        rx={12}
        className={cn(
          active ? "fill-foreground/[0.06]" : "fill-foreground/[0.03]",
        )}
        animate={{
          stroke: active ? n.color : "var(--flow-idle)",
          strokeWidth: active ? 1.8 : 1,
          filter: active
            ? `drop-shadow(0 0 12px ${n.color})`
            : "drop-shadow(0 0 0px transparent)",
        }}
        transition={{ duration: 0.2 }}
      />

      {active && (
        <motion.rect
          x={n.x - 4}
          y={n.y - 4}
          width={n.w + 8}
          height={n.h + 8}
          rx={15}
          fill="none"
          stroke={n.color}
          strokeWidth={1.25}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 0.12, 0.5] }}
          transition={{
            duration: 1.4,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          style={{
            transformOrigin: `${n.x + n.w / 2}px ${n.y + n.h / 2}px`,
          }}
        />
      )}

      <foreignObject x={n.x} y={n.y + 12} width={n.w} height={n.h}>
        <div className="flex flex-col items-center gap-0.5 text-center">
          <Icon
            className="size-5"
            style={{ color: active ? n.color : "var(--flow-icon-idle)" }}
          />
          <span
            className="font-semibold text-[13px] leading-tight"
            style={{
              color: active ? "var(--flow-label-active)" : "var(--flow-label)",
            }}
          >
            {n.label}
          </span>
          <span className="px-1 font-mono text-[10px] text-muted-foreground leading-tight">
            {n.sublabel}
          </span>
        </div>
      </foreignObject>
    </g>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-xs">
      <LegendItem color="var(--flow-web)" label="Channels (web + Slack)" />
      <LegendItem color="var(--flow-agent)" label="nus-agent (eve)" />
      <LegendItem color="var(--flow-gateway)" label="AI Gateway / model" />
      <LegendItem color="var(--flow-fn)" label="Workflow + Vercel Function" />
      <LegendItem color="var(--flow-api)" label="meteoblue API" />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className="size-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
