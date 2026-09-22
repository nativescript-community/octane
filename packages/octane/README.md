# @nativescript-community/octane

[Octane](https://octanejs.dev) on [NativeScript](https://nativescript.org): the universal host driver that turns Octane's host commands into `@nativescript/core` views, the renderer ABI the Octane compiler targets, and the JSX typings for the NativeScript element vocabulary.

Octane ships `octane/universal/native`, a host-neutral runtime with no dependency on its DOM build. A renderer for it is a driver that applies host commands to a native view tree plus some compiler metadata; this package is that renderer for NativeScript.

| Entry                                        | What it is                                                                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@nativescript-community/octane`             | `renderNativeScriptApp`, `createNativeScriptRoot`, the driver and the element registry, plus the universal runtime: it is the compiler-facing renderer ABI |
| `@nativescript-community/octane/config`      | Node-safe renderer metadata for `@octanejs/vite-plugin`; `@nativescript-community/vite-octane` applies it                                                  |
| `@nativescript-community/octane/intrinsics`  | JSX element and attribute types, derived from the installed core view classes                                                                              |
| `@nativescript-community/octane/jsx-runtime` | What `jsxImportSource` resolves to                                                                                                                         |

## Install

```bash
npm i @nativescript-community/octane octane
npm i -D @nativescript-community/vite-octane @octanejs/vite-plugin @nativescript/vite
```

`@octanejs/vite-plugin` declares the `octane` range it compiles for (0.1.52 pairs with octane 0.2.x), and the app must hold a single copy of `octane`: the package root re-exports `octane/universal/native` as the renderer ABI, and hooks only work against the runtime that owns the root.

## Setup

`vite.config.mts`:

```ts
import { defineConfig } from 'vite';
import { octaneConfig } from '@nativescript-community/vite-octane';

export default defineConfig(({ mode }) => octaneConfig({ mode }));
```

`octaneConfig` compiles `src/**/*.tsx` for this renderer by default. To change the scope, pass the registry yourself:

```ts
import { nativeScriptRenderers } from '@nativescript-community/octane/config';

octaneConfig(
  { mode },
  { octane: { renderers: nativeScriptRenderers({ include: 'app/**/*.tsx' }) } },
);
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@nativescript-community/octane"
  }
}
```

### Validation

The stock renderer carries a `validation` block the compiler enforces on the modules it owns: the DOM globals no NativeScript runtime provides (`document`, `window`, `navigator`, `location`, `history`, `localStorage`, `sessionStorage`, `HTMLElement`, `Element`, `Node`, `DOMParser`, `MutationObserver`, `ResizeObserver`, `IntersectionObserver`) and the DOM-side imports (`octane/dom-bindings`, `octane/dom-binding-program`, `octane/hydration`, `react-dom`, each covering its subpaths). A `.tsx` that reaches for one fails to compile with the file and line, instead of failing — or silently doing nothing — on device. What core polyfills stays allowed: `fetch`, `XMLHttpRequest`, `alert`, `confirm`, `matchMedia`, `requestAnimationFrame`, `crypto`, `TextEncoder`, `Blob`, `FormData`, and so on, as does `WebSocket`, which apps polyfill.

Two limits to know: the check covers the modules a renderer rule matches, and a rule can only select `.tsx` for this renderer, so a plain `.ts` helper is not checked; and the check is static, so a computed `globalThis['document']` passes. Each list given to `nativeScriptRenderers` replaces the default one, and `false` turns the check off:

```ts
import {
  nativeScriptRendererValidation,
  nativeScriptRenderers,
} from '@nativescript-community/octane/config';

nativeScriptRenderers({
  validation: {
    forbiddenGlobals: [
      ...nativeScriptRendererValidation.forbiddenGlobals,
      'CustomEvent',
    ],
  },
});
nativeScriptRenderers({ validation: false });
```

The entry mounts a root into a view the app owns. One root per window keeps a second iPad scene or a CarPlay window on the same component wrapper, so a hot update reaches all of them:

```ts
import { Application, Page, type NativeWindow } from '@nativescript/core';
import { renderNativeScriptApp } from '@nativescript-community/octane';
import { App } from './app';

const roots = new Map<
  NativeWindow | undefined,
  ReturnType<typeof renderNativeScriptApp>
>();

function createWindowContent(window: NativeWindow | undefined): Page {
  const page = new Page();
  page.actionBarHidden = true;
  roots.set(window, renderNativeScriptApp(page, App));
  return page;
}

Application.setWindowContentResolver(({ window, isPrimary }) =>
  isPrimary ? undefined : createWindowContent(window),
);
Application.on('windowClose', ({ window }) => {
  roots.get(window)?.unmount();
  roots.delete(window);
});
Application.run({
  create: () => createWindowContent(Application.primaryWindow),
});
```

Components are ordinary Octane components over lowercase NativeScript tags:

```tsx
import { useState } from 'octane';

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <stacklayout className="p-4">
      <label className="text-xl">Count {count}</label>
      <button text="Add one" onTap={() => setCount(count + 1)} />
    </stacklayout>
  );
}
```

## The element vocabulary

Tag names are the lowercase class names of `@nativescript/core`: `absolutelayout`, `actionbar`, `actionitem`, `activityindicator`, `button`, `contentview`, `datepicker`, `docklayout`, `flexboxlayout`, `formattedstring`, `frame`, `gridlayout`, `htmlview`, `image`, `label`, `liquidglass`, `listpicker`, `listview`, `navigationbutton`, `page`, `placeholder`, `progress`, `proxyviewcontainer`, `rootlayout`, `scrollview`, `searchbar`, `segmentedbar`, `segmentedbaritem`, `slider`, `span`, `stacklayout`, `switch`, `tabview`, `tabviewitem`, `textfield`, `textview`, `timepicker`, `webview`, `wraplayout`. Unknown or camelCase names are a type error, not a blank screen.

Props are view properties, not attributes: the driver assigns them onto the instance, so anything a view class exposes (`row`, `colSpan`, `iosOverflowSafeArea`, ...) is a prop. `className` and a string `style` go through the CSS system; an object `style` is assigned onto `view.style`.

Handlers are `on` + the NativeScript event name (`onLoaded`, `onItemTap`), with the web spellings aliased: `onTap`/`onClick`/`onPress` → `tap`, `onDoubleTap`, `onLongPress`, `onChange` → `textChange`, `onSubmit` → `returnPress`.

### Plugin views

Register a tag for any `ViewBase` subclass, and extend the JSX types from a `.d.ts` in the app:

```ts
import { registerElement } from '@nativescript-community/octane';
import { Drawer } from '@nativescript-community/ui-drawer';

registerElement('drawer', Drawer);

declare module '@nativescript-community/octane/intrinsics' {
  interface NativeScriptElements {
    drawer: Attributes<typeof Drawer>;
  }
}
```

`CommonAttributes` is the place for attributes a plugin adds to every view (a `menu` prop, say). Views whose parent wires children through properties rather than `addChild` (a drawer's `mainContent` and `leftDrawer`) take `hostSlot="mainContent"`, and the driver assigns the property instead of inserting.

Registering a tag that is already registered with a different class recreates every live instance of the tag in place, keeping props, listeners, children and position. That is what lets a hot-reloaded element module reach a running app without a remount, so keep registrations in a module that accepts its own updates:

```ts
import.meta.hot?.accept();
```

## Driver contract

Details of the host contract that are easy to get wrong, each learned by watching a subtree vanish:

- **Text is a host node.** Octane lowers `<label>Hi {name}</label>` to `#text` children; the driver folds them into the parent's `text` and keeps `text="..."` working alongside.
- **`update` merges.** An update carries the host's dynamic-prop snapshot; attributes that were static in the compiled plan arrive only with `create`. Replacing would strip a node's static layout props on its first update.
- **Events during a commit are deferred.** Attaching a subtree fires `loaded` synchronously, inside the batch that registered the listener, before the listener is live. The driver defers those to a microtask and drops a dispatch to a listener that is gone rather than aborting the batch.
- **Detaching is defensive.** `LayoutBase.removeChild` throws for a view that is not attached, and `insert` detaches unconditionally, so the driver checks `parent` first.
- **Hidden means `collapse`.** A `visibility` command maps `hidden` to NativeScript's `collapse`, which removes the view from layout as well as from the screen.

## Peer versions

- `octane` >= 0.1.51 (the universal runtime API this driver targets; unchanged through 0.2.2), compiled by `@octanejs/vite-plugin` >= 0.1.51.
- `@nativescript/core` >= 9.1.0.
