# NativeScript + Octane

Packages for running [Octane](https://octanejs.dev) apps on [NativeScript](https://nativescript.org).

| Package                                                         | What it is                                                                                                                                                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@nativescript-community/octane`](./packages/octane)           | The NativeScript renderer for Octane: a universal host driver that applies Octane's host commands to `@nativescript/core` views, the renderer ABI the compiler targets, the element registry, and the JSX typings.        |
| [`@nativescript-community/vite-octane`](./packages/vite-octane) | The Octane flavor for `@nativescript/vite`: the config helper and the Vite HMR strategy that hot-updates Octane components on device. Built entirely on the public flavor API — the shape any community package can take. |

The reference app is [`ns-octane`](https://github.com/NathanWalker/ns-octane): a ChatGPT-style chat client built on these packages, with Vite HMR, plugin views registered from TypeScript, and a native element defined in TypeScript.

## Develop

```bash
npm install
npx nx run-many -t build test     # every package
npx nx test @nativescript-community/octane
```

Packages build in place to `packages/<name>/dist` and publish from there.
