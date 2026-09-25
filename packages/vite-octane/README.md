# @nativescript-community/vite-octane

The [Octane](https://octanejs.dev) flavor for [`@nativescript/vite`](https://www.npmjs.com/package/@nativescript/vite): a config helper that runs `@octanejs/vite-plugin` inside a NativeScript Vite build, and the Vite HMR strategy that applies Octane component edits to a running app without a restart.

Octane renders NativeScript views through `@nativescript-community/octane`, a universal host driver that applies Octane's host commands to `@nativescript/core` views. This package wires that renderer into the build.

## Install

```bash
npm i -D @nativescript-community/vite-octane @nativescript/vite @octanejs/vite-plugin
npm i @nativescript-community/octane octane
```

`vite.config.mts`:

```ts
import { defineConfig } from 'vite';
import { octaneConfig } from '@nativescript-community/vite-octane';

export default defineConfig(({ mode }) => octaneConfig({ mode }));
```

A NativeScript renderer is not one of Octane's built-ins, so `octaneConfig` hands `@octanejs/vite-plugin` the registry from `@nativescript-community/octane/config`, scoped to `src/**/*.{tsx,tsrx}`. Pass `octane.renderers` yourself to change the scope:

```ts
import { nativeScriptRenderers } from '@nativescript-community/octane/config';

octaneConfig(
  { mode },
  { octane: { renderers: nativeScriptRenderers({ include: 'app/**/*.tsx' }) } },
);
```

Then:

```bash
ns debug ios
ns debug android
```

`npx nativescript-vite init` recognises the package and generates the config above.

## What a save does

Octane's compiler wraps every exported component in `hmrUniversalComponent` and emits `import.meta.hot.accept(...)` while the dev server is serving. The strategy in this package sequences the device's hot registry around that:

| You edit                                                     | What happens                                                                                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| a `.tsx` component                                           | the live wrapper receives the new render function; its owners re-render in place; hook state survives                                       |
| a plain module a component imports                           | the reverse import graph is walked to the nearest accepting importer, which is evicted and re-imported                                      |
| a worker script                                              | never re-imported in the main realm; the module that accepts it by path (`import.meta.hot.accept('./my.worker', respawn)`) takes the update |
| a module that accepts itself (a registry kept in `hot.data`) | re-evaluates in place                                                                                                                       |
| something nothing accepts (the entry, the driver)            | every app-owned module is evicted and the entry re-imported in process — `@nativescript/core` and vendor modules stay warm                  |

A module that throws while re-evaluating is reported; the app keeps running the previous revision and the next good save applies in place. A dev-server restart (editing the renderer config) becomes one ordered graph reload.

Which accept callback fires is the one Octane-specific decision in here. Vite keeps the callbacks of a module's _latest_ evaluation; the wrapper that owns the live owners belongs to its _first_ evaluation, so the strategy anchors on that callback and keeps firing it.

## Peer versions

- `@octanejs/vite-plugin` declares the `octane` range it compiles for (0.1.52 pairs with octane 0.2.x); install a pair that satisfies it.
- Octane declares TypeScript `^5.9` as an optional peer.
