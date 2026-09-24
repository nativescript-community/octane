## 0.2.3 (2026-09-24)

### 🩹 Fixes

- normalize class prop values ([#11](https://github.com/nativescript-community/octane/pull/11))

### ❤️ Thank You

- Alec Larson @aleclarson

## 0.2.2 (2026-09-23)

### 🚀 Features

- **octane:** host TabView items and their views from JSX ([#10](https://github.com/nativescript-community/octane/pull/10))

### ❤️ Thank You

- Nathan Walker

## 0.2.1 (2026-09-23)

### 🚀 Features

- **octane:** manage listview cells through renderItem ([#7](https://github.com/nativescript-community/octane/pull/7), closes [#1](https://github.com/nativescript-community/octane/issues/1))
  - `renderItem` on a `listview` gives every recycled cell its own Octane root, bound to the current `items[index]` (array, `ItemsSource` or `ObservableArray`) and diffed in place when the cell is recycled for another row, when `items` changes, or when `renderItem` changes identity. A rebind whose row, item and renderer are unchanged is skipped, so NativeScript's per-layout re-preparation is free.
- **octane:** ship DOM validation with the stock renderer ([#6](https://github.com/nativescript-community/octane/pull/6), closes [#2](https://github.com/nativescript-community/octane/issues/2))
  - `nativeScriptRenderer.validation` forbids the DOM globals (`document`, `window`, `navigator`, `location`, `history`, the storages, the DOM node classes and observers) and the DOM-side imports (`octane/dom-bindings`, `octane/dom-binding-program`, `octane/hydration`, `react-dom`) no NativeScript runtime provides; what core polyfills stays allowed. `nativeScriptRenderers({ validation })` merges a list over the defaults or turns the check off with `false`.

### 🩹 Fixes

- **octane:** stop a prop write from echoing as its own change event ([#5](https://github.com/nativescript-community/octane/pull/5), closes [#3](https://github.com/nativescript-community/octane/issues/3))
  - The driver mutes a prop's paired change event (`text` → `textChange`, `checked` → `checkedChange`, ...) while it writes that prop, so a controlled `<textfield text={value} onChange={...} />` receives `onChange` only for edits the driver did not make.

### ❤️ Thank You

- Nathan Walker
