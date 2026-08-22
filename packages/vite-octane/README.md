# @nativescript/vite-octane

The [Octane](https://octanejs.dev) flavor for [`@nativescript/vite`](https://www.npmjs.com/package/@nativescript/vite): a config helper that runs `@octanejs/vite-plugin` inside a NativeScript Vite build, and the Vite HMR strategy that applies Octane component edits to a running app without a restart.

Octane renders NativeScript views through a universal host driver the app owns — `octane/universal/native` plus a driver that applies host commands to `@nativescript/core` views. The renderer is the app's; this package is the development loop around it. See [`ns-octane`](https://github.com/NathanWalker/ns-octane) for a complete app.

## Install

```bash
npm i -D @nativescript/vite-octane @nativescript/vite @octanejs/vite-plugin
npm i octane
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { octaneConfig } from '@nativescript/vite-octane';
import { nativeScriptRenderers } from './src/octane/config';

export default defineConfig(({ mode }) =>
  octaneConfig({ mode }, { octane: { renderers: nativeScriptRenderers } }),
);
```

`octane.renderers` is the renderer config `@octanejs/vite-plugin` would otherwise read from `octane.config.ts`; a NativeScript renderer is not one of Octane's built-ins, so the app declares its own. Then:

```bash
ns debug ios      # HMR by default — the CLI starts the dev server
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

Which accept callback fires is the one Octane-specific decision in here. Vite keeps the callbacks of a module's _latest_ evaluation; the wrapper that owns the live owners belongs to its _first_ evaluation, so the strategy anchors on that callback and keeps firing it. Everything else is Vite's contract, written once for a native host — see the `@nativescript/vite` [framework-flavors guide](https://github.com/NativeScript/NativeScript/blob/main/packages/vite/docs/framework-flavors.md), of which this package is the worked example.

## Peer versions

- `octane` and `@octanejs/vite-plugin` must be the same version.
- Octane declares TypeScript `^5.9` as an optional peer.
