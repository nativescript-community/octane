/**
 * Serializable compiler metadata for the NativeScript renderer.
 *
 * Read on the Node side, by a Vite config, so it must not import
 * `@nativescript/core` or an Octane runtime.
 */
export const NATIVESCRIPT_RENDERER_ID = 'nativescript';

export const nativeScriptRenderer = {
  /** The package root re-exports the universal runtime, which is what makes it a valid renderer module. */
  module: '@nativescript-community/octane',
  target: 'universal',
  /** There is no server half of a NativeScript app. */
  server: 'unsupported',
  /** The `@jsxImportSource` a module may name to claim the renderer. */
  intrinsics: '@nativescript-community/octane',
  /** `<label>text</label>` lowers to a `#text` host the driver folds into the parent's `text`. */
  text: 'host',
} as const;

export interface NativeScriptRenderersOptions {
  /** Glob of the modules the renderer compiles. Defaults to `src/**\/*.tsx`. */
  include?: string;
}

/**
 * The renderer registry `@octanejs/vite-plugin` reads. The renderer is scoped
 * to `.tsx` by rule rather than set as the default so plain `.ts` modules
 * stay unowned: a `server: 'unsupported'` renderer cannot own them, and the
 * compiler rejects a config whose rule selects one.
 */
export function nativeScriptRenderers(
  options: NativeScriptRenderersOptions = {},
) {
  return {
    registry: { [NATIVESCRIPT_RENDERER_ID]: nativeScriptRenderer },
    rules: [
      {
        include: options.include ?? 'src/**/*.tsx',
        renderer: NATIVESCRIPT_RENDERER_ID,
      },
    ],
  } as const;
}
