import { describe, expect, it } from 'vitest';
import {
  NATIVESCRIPT_RENDERER_ID,
  nativeScriptRenderer,
  nativeScriptRenderers,
} from './config.js';

describe('nativeScriptRenderer', () => {
  it('points the compiler at the package renderer ABI and intrinsics', () => {
    expect(nativeScriptRenderer.module).toBe('@nativescript-community/octane');
    expect(nativeScriptRenderer.intrinsics).toBe(
      '@nativescript-community/octane',
    );
    expect(nativeScriptRenderer.target).toBe('universal');
    expect(nativeScriptRenderer.server).toBe('unsupported');
    expect(nativeScriptRenderer.text).toBe('host');
  });
});

describe('nativeScriptRenderers', () => {
  it('scopes the renderer to .tsx modules by default', () => {
    const config = nativeScriptRenderers();
    expect(config.registry[NATIVESCRIPT_RENDERER_ID]).toBe(
      nativeScriptRenderer,
    );
    expect(config.rules).toEqual([
      { include: 'src/**/*.tsx', renderer: NATIVESCRIPT_RENDERER_ID },
    ]);
  });

  it('accepts a custom include glob', () => {
    expect(
      nativeScriptRenderers({ include: 'app/**/*.tsx' }).rules[0].include,
    ).toBe('app/**/*.tsx');
  });
});
