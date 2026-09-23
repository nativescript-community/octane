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
npx nx test octane
```

Packages build in place to `packages/<name>/dist` and publish from there.

## Release

Releases run from the [Release workflow](./.github/workflows/release.yml) (Actions → Release → Run workflow), which mirrors NativeScript's own: `nx release` bumps the version, prepends the project `CHANGELOG.md`, commits and tags `{version}-{project}` (`0.2.1-octane`), publishes to npm through OIDC trusted publishing with provenance, and posts a GitHub release from the changelog section.

- `release-group`: `octane` or `vite-octane`; empty releases every package.
- `release-type`: `patch` / `minor` / `major` publish to `latest`; `prerelease` publishes to the `preid` dist-tag (`next` by default). `version` sets an exact version instead.
- `dry-run` runs the whole thing without pushing or publishing. Run it first.

Pushing a `<version>-<project>` tag by hand publishes that project as committed, with no version bump — the recovery path for a tagged commit that never reached npm.

One-time setup, outside the repo: on npmjs.com each package names this repository, `release.yml` and the `npm-publish` environment as its trusted publisher, and the repository has `npm-publish` and `npm-publish-dry-run` environments (the dry run never touches npm). To publish with a token instead, set the `USE_NPM_TOKEN` variable to `true` and add an `NPM_PUBLISH_TOKEN` secret.
