# NativeScript + Octane

Packages for running [Octane](https://octanejs.dev) apps on [NativeScript](https://nativescript.org).

| Package                                                         | What it is                                                                                                                                                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@nativescript-community/vite-octane`](./packages/vite-octane) | The Octane flavor for `@nativescript/vite`: the config helper and the Vite HMR strategy that hot-updates Octane components on device. Built entirely on the public flavor API — the shape any community package can take. |

The reference app is [`ns-octane`](https://github.com/NathanWalker/ns-octane): an Octane universal renderer driving `@nativescript/core` views, with Vite HMR, a worker-driven Metal shader, and a native element defined in TypeScript.

## Develop

```bash
npm install
npx nx run-many -t build test     # every package
npx nx test @nativescript-community/vite-octane
```

Packages build in place to `packages/<name>/dist` and publish from there.

> Until the `@nativescript/vite` release that carries the framework-flavor API is published,
> the workspace installs it from `tools/vendor/`.
