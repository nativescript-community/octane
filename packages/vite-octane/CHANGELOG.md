## 0.2.1 (2026-09-23)

### 🩹 Fixes

- **vite-octane:** keep the octane root out of the dev deps bundle seed ([#4](https://github.com/nativescript-community/octane/pull/4), closes [NativeScript/NativeScript#11440](https://github.com/NativeScript/NativeScript/issues/11440))
  - The flavor declares `vendor: { exclude: ['octane'] }` through `@nativescript/vite` 8.0.11, so a dev session no longer vendors Octane's DOM runtime: the first-boot deps bundle of the sample app drops from 82 to 42 modules (1.68 MB to 639 KB). The `@nativescript/vite` peer floor is now `>=8.0.11`.

### ❤️ Thank You

- Nathan Walker
