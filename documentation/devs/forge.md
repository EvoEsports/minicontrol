# Forge — JSX renderer & hooks 🔧

**Location:** `core/ui/forge.ts`

## What is Forge?
Forge implements a lightweight JSX-like renderer for producing Manialink XML and in-manialink Maniascript code. It provides:

- A tiny virtual-DOM shape via `createElement`/`jsx`/`jsxs` and `Fragment`.
- A hooks-like system (`setScript`, `setScriptHeader`) to register Maniascript strings or cleanup functions during render.
- Utilities to build safe Maniascript fragments and to register/override components at runtime.

## Quick import
```ts
import { createElement, Fragment, setScript, setScriptHeader, getComponent, registerComponent, getProperties, maniascriptFragment } from '@core/ui/forge';
```

## Core functions & behavior

- `createElement(type, props, ...children)` — create a virtual element object.
- `Fragment(props)` — passthrough container for lists of children.
- `jsx(type, props, key)` / `jsxs` — compatible helpers used by TypeScript/JSX transforms.
- `maniascriptFragment(text?)` — returns an XML comment containing the supplied text: ``<!-- text -->``. Useful to inject raw Maniascript into `<script>` nodes.

### Hooks / Effects

- `setScript(effect: () => string | (() => void), deps?: any[])`
  - Registers a body-level effect; the `effect` is called during the commit phase.
  - If `effect()` returns a `string`, it is treated as Maniascript code and appended to the *body* scripts.
  - If it returns a `function`, that function is stored as the cleanup for that hook.

- `setScriptHeader(effect: () => string | (() => void), deps?: any[])`
  - Works like `setScript` but its returned string will be added to the **header** area (above `main()`), for helper functions or global declarations.

- Hooks are deduplicated by dependency comparison and the system keeps `cleanup` functions for teardown when needed.

### Component registry

- `registerComponent(name, comp)` — override or register a component for runtime customization (used by plugins to replace components).
- `unregisterComponent(name)` — remove registration
- `getComponent(name, fallback)` — resolve a component by name, falling back to the `fallback` implementation.
- `getRegisteredComponents()` — debugging helper to inspect current registrations.

### Rendering helpers

- `renderJsx(element)` — convert a virtual element to Manialink XML string (handles strings, arrays, components and attributes).
- `render(element, rootId?, obj?)` — render the element into a full manialink XML (used for testing or non-UI contexts). When `obj` is provided it is attached as `dataObj` for `getProperties()` access.

### Utility functions

- `getProperties()` — returns the `objMap` attached to the current render root (used to access `data` passed into a Manialink).
- `disposeScript(rootId)` — runs all cleanup functions for the given root and removes the root from memory.

## API reference

### Types

- `Properties` — object describing properties passed to components (commonly includes `colors` and arbitrary keys).
- `Hook` — internal type describing registered hooks for header/body effects.

### Functions

- `createElement(tagName: string, props: any, ...children: any[]): object`
  - Create a plain element object used by the renderer.

- `Fragment(props: { children: any[] }) : any[]`
  - Simple passthrough container returning `props.children`.

- `jsx(type: string|function, props: any, key?: string)` / `jsxs(...)`
  - Helpers compatible with TS/JSX transforms that call `createElement`.

- `maniascriptFragment(text?: string) : string`
  - Wrap text in an XML comment so it is emitted verbatim inside a `<script>` node.

- `registerComponent(name: string, comp: any) : void`
- `unregisterComponent(name: string) : void`
- `getComponent<T>(name: string, fallback: T) : T`
- `getRegisteredComponents() : Map<string, any>`

- `setScript(effect: () => string | (() => void), deps?: any[]) : void`
  - Register a body-level effect which either returns a Maniascript string or a cleanup function. When dependencies change, the effect runs again.

- `setScriptHeader(effect: () => string | (() => void), deps?: any[]) : void`
  - Register a header-level effect (same semantics as `setScript`).

- `getProperties() : objMap`
  - Returns the `dataObj` attached to the current render root (commonly accessed as `const props = getProperties();`).

- `disposeScript(rootId = 'default') : void`
  - Run all cleanup functions for the hooks on the given root and remove the root.

- `render(element:any, rootId?: string, obj?: objMap) : string`
  - High-level render function (returns a full `<manialink>` string; primarily for testing or non-Manialink use).

- `renderJsx(element:any) : string`
  - Core renderer converting virtual elements to Manialink XML.

### Globals

- `roots : Map<string, { hooks: Hook[]; dataObj?: objMap }>` — map of render roots (useful for debugging during development).


## Examples

### Simple component with Maniascript injection
```tsx
import { createElement as h, maniascriptFragment, getProperties } from '@core/ui/forge';

export default function Updater() {
  const props = getProperties();
  const data = props.data;

  return (
    <script>
      {maniascriptFragment(`
        main() {
          declare Text Data_PlayerNames for This;
          Data_PlayerNames = """${JSON.stringify(data.playerjson)}""";
        }
      `)}
    </script>
  );
}
```

### Using `setScript` to provide script body
```ts
setScript(() => {
  // Return a Maniascript string appended to the manialink's body
  return `
    // body script
    Void _tick() {
      // do something
    }
  `;
}, [someDependency]);
```

### Providing header helpers
```ts
setScriptHeader(() => {
  return `
  declare Text[] MyHelper for This;
  Void _helper() {
    // ...
  }
  `;
});
```

### Real-world examples in this repo
- `userdata/plugins/ulol/scoretable/ui/updater.tsx` — uses `getProperties()` and `maniascriptFragment` to inject JSON data into a `<script>` node.
- `userdata/plugins/rmt/ui/overrideGreeting.tsx` — demonstrates `registerComponent` to override a component and `setScript()` to register script body code.

**Example: `overrideGreeting.tsx`**
```ts
import { createElement, setScript, registerComponent } from '@core/ui/forge';

function Greeting({ name }) {
  setScript(() => {
    return `console.log('Overridden Greeting for ${name}');`;
  }, [name]);

  return <label text={`Overridden: ${name}`} />;
}

registerComponent('Greeting', Greeting);
```

## Best practices & tips 💡

- Alias `createElement` when you prefer a shorter helper (`h`, `el`, or domain-specific `manialink`).
- Use `maniascriptFragment` to safely inject script blocks inside `<script>` elements.
- Only call `setScript` / `setScriptHeader` during render; avoid side-effects outside hooks.
- Use `registerComponent` to allow plugins to override components without modifying upstream code.

### Contributing & naming conventions

- Prefer consistent aliases across the repo. Examples:
  - `import { createElement as h } from '@core/ui/forge';` (compact & idiomatic)
  - `import { createElement as manialink } from '@core/ui/forge';` (domain-specific clarity)
  - `import * as ui2 from '@core/ui/forge';` (namespaced access when many helpers are needed)
- Keep aliases short in files with high JSX usage (`h`, `el`) and explicit in library code (`createElement`, `manialink`).
- Add a short note in `CONTRIBUTING.md` or `documentation/devs/` if you plan to standardize names across the project.

---

For full runtime details, see the source: `core/ui/forge.ts`.}