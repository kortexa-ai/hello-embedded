// json-render catalog + registry, modeled after openhome-porch/Window's setup.
// The catalog declares which components are valid in a spec; the registry
// maps those names to React implementations. We use the shadcn-based
// catalog for the standard widget set (Stack, Card, Heading, Button,
// Input, etc.) — see node_modules/@json-render/shadcn/dist/catalog.d.ts.

import { defineCatalog } from "@json-render/core";
import { defineRegistry } from "@json-render/react";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { shadcnComponents } from "@json-render/shadcn";

export const catalog = defineCatalog(schema, {
  components: { ...shadcnComponentDefinitions },
});

export const { registry } = defineRegistry(catalog, {
  components: { ...shadcnComponents },
});
