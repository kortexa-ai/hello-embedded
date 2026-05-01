import { useState } from "react";
import { JSONUIProvider, Renderer } from "@json-render/react";
import type { Spec } from "@json-render/core";
import { registry } from "./json-render";

// Sample spec exercising a spread of shadcn controls from the catalog.
// Prop names are catalog-canonical (see node_modules/@json-render/shadcn/
// dist/catalog.d.ts) — Button uses `label` not `children`, Text/Heading/
// Badge use `text`, Alert uses `message` + `type`, Switch/Checkbox/Input/
// Textarea require `name`, Slider takes `value` not `defaultValue`, etc.
// Laid out as 4 horizontal columns so the whole spec still fits the 1920×480
// panel after the renderer is zoomed 1.6× for chunkier touch targets.
const sampleNested = {
  component: "Card",
  props: { title: "json-render demo" },
  children: [
    {
      component: "Stack",
      props: { direction: "horizontal", gap: "xl", justify: "between", className: "w-full" },
      children: [
        {
          component: "Stack",
          props: { direction: "vertical", gap: "sm" },
          children: [
            { component: "Input", props: { name: "foo", label: "Input", placeholder: "Type something…" } },
            { component: "Textarea", props: { name: "bar", label: "Textarea", placeholder: "More words…", rows: 1 } },
          ],
        },
        {
          component: "Stack",
          props: { direction: "vertical", gap: "sm" },
          children: [
            { component: "Switch", props: { name: "tog1", label: "Switch" } },
            { component: "Checkbox", props: { name: "ck1", label: "Checkbox" } },
            { component: "Badge", props: { text: "Badge", variant: "default" } },
          ],
        },
        {
          component: "Stack",
          props: { direction: "vertical", gap: "sm" },
          children: [
            { component: "Slider", props: { label: "Slider", min: 0, max: 100, value: 40 } },
            { component: "Progress", props: { value: 60, max: 100, label: "Loading" } },
          ],
        },
        {
          component: "Stack",
          props: { direction: "vertical", gap: "sm" },
          children: [
            {
              component: "Stack",
              props: { direction: "horizontal", gap: "sm" },
              children: [
                { component: "Button", props: { label: "Primary", variant: "primary" } },
                { component: "Button", props: { label: "Secondary", variant: "secondary" } },
                { component: "Button", props: { label: "Danger", variant: "danger" } },
              ],
            },
            { component: "Alert", props: { title: "Alert", message: "Informational message", type: "info" } },
          ],
        },
      ],
    },
  ],
};

// Convert nested → flat (root + elements map) format expected by Renderer.
function flatten(node: any): { root: string; elements: Record<string, any> } {
  const elements: Record<string, any> = {};
  let id = 0;
  function walk(n: any): string {
    const elId = `el-${id++}`;
    const childIds = (n.children ?? []).map(walk);
    elements[elId] = {
      type: n.component,
      props: n.props ?? {},
      children: childIds.length ? childIds : undefined,
    };
    return elId;
  }
  return { root: walk(node), elements };
}

const spec = flatten(sampleNested) as unknown as Spec;

export function Page2View() {
  const [renderError, setRenderError] = useState<string | null>(null);

  if (renderError) {
    return <div className="p-6 text-destructive">render error: {renderError}</div>;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground">
      <div className="flex h-full flex-col gap-2 p-3">
        <a
          href="./index.html"
          className="self-start rounded-md border border-[#fff5e6]/40 px-[4rem] py-[1.6rem] text-[1.8rem] no-underline hover:bg-[#fff5e6]/10"
        >
          ← back to home
        </a>
        {/* zoom: 1.6 scales the whole rendered spec (controls + spacing) since
            shadcn components don't expose a size prop. WebKit-only property,
            but Electrobun is WebKit-based so this is safe here. */}
        <div className="min-h-0 flex-1 overflow-hidden" style={{ zoom: 1.6 }}>
          <ErrorBoundary onError={(e) => setRenderError(String(e))}>
            <JSONUIProvider registry={registry}>
              <Renderer spec={spec} registry={registry} />
            </JSONUIProvider>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

import { Component, type ReactNode } from "react";
class ErrorBoundary extends Component<
  { children: ReactNode; onError: (e: unknown) => void },
  { errored: boolean }
> {
  state = { errored: false };
  static getDerivedStateFromError() {
    return { errored: true };
  }
  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }
  render() {
    return this.state.errored ? null : this.props.children;
  }
}
