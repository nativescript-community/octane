import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createContext,
  createPortal,
  createUniversalRoot,
  defineUniversalComponent,
  universalComponent,
  universalContext,
  universalKey,
  universalPlan,
  universalValue,
  useContext,
  type UniversalHostCommand,
  type UniversalPortalTargetHandle,
  type UniversalRoot,
} from 'octane/universal/native';

vi.mock('@nativescript/core', async () =>
  (await import('../tests/core-mock.js')).createCoreMock(),
);

import * as core from '@nativescript/core';
import {
  MockLayoutBase,
  MockTextBase,
  type MockView,
} from '../tests/core-mock.js';
import { create, insert, mount, releaseMounted } from '../tests/mount.js';
import { NATIVESCRIPT_RENDERER_ID } from './config.js';
import {
  createNativeScriptContainer,
  createNativeScriptRoot,
  nativeScriptDriver,
} from './driver.js';

const RID = NATIVESCRIPT_RENDERER_ID;

const labelPlan = universalPlan(RID, {
  kind: 'host',
  type: 'label',
  bindings: [['text', 0]],
});
const markerPlan = universalPlan(RID, { kind: 'host', type: 'stacklayout' });
const cardPlan = universalPlan(RID, {
  kind: 'host',
  type: 'gridlayout',
  children: [{ kind: 'host', type: 'label', props: { text: 'inner' } }],
});

/** A real Octane root over a mock host; `root.unmount()` cleans up. */
function renderRoot(host: MockView): UniversalRoot {
  return createNativeScriptRoot(host as unknown as core.ViewBase);
}

function labels(view: MockLayoutBase): MockTextBase[] {
  return view.children as unknown as MockTextBase[];
}

afterEach(releaseMounted);

describe('portals', () => {
  /**
   * A portal shares its declaration site's Octane root, so a consumer rendered
   * through it reads the context provided at the declaration site — including
   * later provider updates. Portals are not cross-root context inheritance:
   * they place native views, never move logical ownership.
   */
  it('renders into a native target with declaration-site context and live updates', () => {
    const Theme = createContext('default');
    const Reader = defineUniversalComponent(RID, () =>
      universalValue(labelPlan, [useContext(Theme)]),
    );
    const Scene = defineUniversalComponent(
      RID,
      (props: { theme: string; target: core.LayoutBase }) =>
        universalContext(Theme, props.theme, [
          universalValue(markerPlan),
          createPortal(universalComponent(RID, Reader), props.target),
        ]),
    );

    const host = new MockLayoutBase();
    const target = new core.GridLayout() as unknown as MockLayoutBase;
    const root = renderRoot(host);

    root.render(Scene, { theme: 'warm', target: target as never });
    // The marker stays in the root host; only the portal child lands on target.
    expect(host.children).toHaveLength(1);
    expect(labels(target)).toHaveLength(1);
    expect(labels(target)[0].text).toBe('warm');
    const leaf = labels(target)[0];

    // A provider update at the declaration site reaches the portal child,
    // which is updated in place rather than remounted.
    root.render(Scene, { theme: 'cool', target: target as never });
    expect(labels(target)[0]).toBe(leaf);
    expect(leaf.text).toBe('cool');

    root.unmount();
    expect(target.children).toHaveLength(0);
    expect((leaf as unknown as MockView).parent).toBeNull();
  });

  it('keeps a portal inside a Page root without disturbing page content', () => {
    const Reader = defineUniversalComponent(RID, () =>
      universalValue(labelPlan, ['leaf']),
    );
    const Scene = defineUniversalComponent(
      RID,
      (props: { target: core.LayoutBase }) => [
        universalValue(markerPlan),
        createPortal(universalComponent(RID, Reader), props.target),
      ],
    );

    const page = new core.Page() as unknown as core.ContentView & {
      content: MockView | null;
    };
    const target = new core.GridLayout() as unknown as MockLayoutBase;
    const root = renderRoot(page as unknown as MockView);

    root.render(Scene, { target: target as never });
    // The authored page content is the scene's marker; the portal adds nothing
    // to the page — only to the selected target view.
    const content = page.content;
    expect(content).not.toBeNull();
    expect(content?.typeName).toBe('StackLayout');
    expect(labels(target)).toHaveLength(1);

    root.unmount();
    expect(page.content).toBeNull();
    expect(target.children).toHaveLength(0);
  });

  it('shares one target between portals and keeps declaration order', () => {
    const Scene = defineUniversalComponent(
      RID,
      (props: { target: core.LayoutBase }) => [
        createPortal(universalValue(labelPlan, ['first']), props.target),
        createPortal(universalValue(labelPlan, ['second']), props.target),
      ],
    );

    const host = new MockLayoutBase();
    const target = new core.GridLayout() as unknown as MockLayoutBase;
    const root = renderRoot(host);

    root.render(Scene, { target: target as never });
    expect(labels(target).map((label) => label.text)).toEqual([
      'first',
      'second',
    ]);

    root.unmount();
    expect(target.children).toHaveLength(0);
  });

  it('reorders keyed portal children within their target in place', () => {
    const Scene = defineUniversalComponent(
      RID,
      (props: { order: readonly string[]; target: core.LayoutBase }) =>
        createPortal(
          props.order.map((label) =>
            universalKey(label, universalValue(labelPlan, [label])),
          ),
          props.target,
        ),
    );

    const host = new MockLayoutBase();
    const target = new core.GridLayout() as unknown as MockLayoutBase;
    const root = renderRoot(host);

    root.render(Scene, {
      order: ['first', 'second'],
      target: target as never,
    });
    const [first, second] = labels(target);
    expect(labels(target).map((label) => label.text)).toEqual([
      'first',
      'second',
    ]);

    root.render(Scene, {
      order: ['second', 'first'],
      target: target as never,
    });
    expect(target.children).toEqual([second, first]);

    root.unmount();
  });

  it('moves the subtree to the new target on retarget without remounting', () => {
    const Scene = defineUniversalComponent(
      RID,
      (props: { target: core.LayoutBase }) =>
        createPortal(universalValue(cardPlan), props.target),
    );

    const host = new MockLayoutBase();
    const targetA = new core.GridLayout() as unknown as MockLayoutBase;
    const targetB = new core.GridLayout() as unknown as MockLayoutBase;
    const root = renderRoot(host);

    root.render(Scene, { target: targetA as never });
    const card = targetA.children[0];
    expect(labels(card as unknown as MockLayoutBase)[0].text).toBe('inner');

    root.render(Scene, { target: targetB as never });
    expect(targetA.children).toHaveLength(0);
    expect(targetB.children[0]).toBe(card);
    expect((card as unknown as MockView).parent).toBe(targetB);

    root.unmount();
    expect(targetB.children).toHaveLength(0);
  });

  it('rejects non-view and non-layout targets', () => {
    const Scene = defineUniversalComponent(RID, (props: { target: unknown }) =>
      createPortal(universalValue(labelPlan, ['leaf']), props.target),
    );

    const host = new MockLayoutBase();
    const root = renderRoot(host);
    const ready = universalValue(markerPlan);

    root.render(
      defineUniversalComponent(RID, () => ready),
      undefined,
    );

    expect(() => root.render(Scene, { target: 42 })).toThrow(
      /must be a NativeScript view/,
    );
    expect(() => root.render(Scene, { target: null })).toThrow(
      /must be a NativeScript view/,
    );
    expect(() => root.render(Scene, { target: new core.Label() })).toThrow(
      /cannot host portal children/,
    );

    // Failed renders leave the committed tree intact.
    expect(host.children).toHaveLength(1);
    root.unmount();
  });

  it('rejects a target view owned by another root', () => {
    const foreign = mount(new MockLayoutBase());
    foreign.apply(create(1, 'gridlayout'), insert(1));
    const foreignView = foreign.view<MockLayoutBase>(1);

    const Scene = defineUniversalComponent(
      RID,
      (props: { target: core.LayoutBase }) =>
        createPortal(universalValue(labelPlan, ['leaf']), props.target),
    );
    const root = renderRoot(new MockLayoutBase());

    expect(() => root.render(Scene, { target: foreignView as never })).toThrow(
      /another Octane root/,
    );
    root.unmount();
  });

  it('resolves handle parents only while their registration is active', () => {
    const { container, apply } = mount(new MockLayoutBase());
    const target = new core.GridLayout() as unknown as MockLayoutBase;
    const prepareTarget = nativeScriptDriver.portals!.prepareTarget;
    const mint = (id: string | number): UniversalPortalTargetHandle => ({
      $$kind: 'octane.universal.portal-target',
      renderer: RID,
      root: 0,
      id,
    });
    const context = {
      container,
      renderer: RID,
      transported: false,
      createPortalTargetHandle: mint,
    };

    const registration = prepareTarget({ ...context, target: target as never });
    apply(create(1, 'label', { text: 'leaf' }), {
      op: 'insert',
      id: 1,
      parent: registration.handle,
      before: null,
    } as UniversalHostCommand);
    expect(labels(target).map((label) => label.text)).toEqual(['leaf']);

    // A fabricated or foreign-root handle never resolves to the root container.
    expect(() =>
      apply(create(2, 'label'), {
        op: 'insert',
        id: 2,
        parent: mint('forged'),
        before: null,
      } as UniversalHostCommand),
    ).toThrow(/inactive portal target/);
    expect(() =>
      apply(create(3, 'label'), {
        op: 'insert',
        id: 3,
        parent: 'bogus',
        before: null,
      } as unknown as UniversalHostCommand),
    ).toThrow(/must be a host id/);

    // After release the same handle is stale and fails instead of attaching.
    registration.release();
    expect(container.portalTargets.size).toBe(0);
    expect(() =>
      apply(create(4, 'label'), {
        op: 'insert',
        id: 4,
        parent: registration.handle,
        before: null,
      } as UniversalHostCommand),
    ).toThrow(/inactive portal target/);
  });

  it('unmount releases every portal registration and orphans nothing', () => {
    const Scene = defineUniversalComponent(
      RID,
      (props: { targets: readonly core.LayoutBase[] }) => [
        createPortal(universalValue(labelPlan, ['a']), props.targets[0]),
        createPortal(
          [universalValue(labelPlan, ['b']), universalValue(labelPlan, ['c'])],
          props.targets[1],
        ),
      ],
    );

    const container = createNativeScriptContainer(
      new MockLayoutBase() as unknown as core.ViewBase,
    );
    const root = createUniversalRoot(container, nativeScriptDriver, {
      scheduleMicrotask: (callback) => {
        Promise.resolve().then(callback);
      },
    });
    container.root = root;

    const targetA = new core.GridLayout() as unknown as MockLayoutBase;
    const targetB = new core.GridLayout() as unknown as MockLayoutBase;
    root.render(Scene, {
      targets: [targetA, targetB] as never,
    });
    expect(container.portalTargets.size).toBe(2);
    const b = labels(targetB)[0];

    root.unmount();
    expect(container.portalTargets.size).toBe(0);
    expect(targetA.children).toHaveLength(0);
    expect(targetB.children).toHaveLength(0);
    expect((b as unknown as MockView).parent).toBeNull();
  });
});
