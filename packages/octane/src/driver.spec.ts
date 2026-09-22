import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  UniversalHostBatch,
  UniversalHostCommand,
  UniversalRoot,
} from 'octane/universal/native';

vi.mock('@nativescript/core', async () =>
  (await import('../tests/core-mock.js')).createCoreMock(),
);

import * as core from '@nativescript/core';
import {
  MockContentView,
  MockFormattedString,
  MockLayoutBase,
  MockTextBase,
  type MockView,
} from '../tests/core-mock.js';
import {
  createNativeScriptContainer,
  type NativeScriptContainer,
  nativeScriptDriver,
  releaseNativeScriptContainer,
} from './driver.js';
import { type ElementConstructor, registerElement } from './elements.js';

type Command = UniversalHostCommand;
type Listener = { id: number; priority: 'discrete' };

const create = (
  id: number,
  type: string,
  props: Record<string, unknown> = {},
): Command => ({ op: 'create', id, type, props });
const insert = (
  id: number,
  parent: number | null = null,
  before: number | null = null,
): Command => ({ op: 'insert', id, parent, before });
const move = (
  id: number,
  parent: number | null = null,
  before: number | null = null,
): Command => ({ op: 'move', id, parent, before });
const update = (id: number, props: Record<string, unknown>): Command => ({
  op: 'update',
  id,
  props,
});
const remove = (id: number, parent: number | null = null): Command => ({
  op: 'remove',
  id,
  parent,
});
const event = (
  id: number,
  type: string,
  listener: Listener | null,
): Command => ({ op: 'event', id, type, listener });
const listener = (id: number): Listener => ({ id, priority: 'discrete' });

const live: NativeScriptContainer[] = [];

afterEach(() => {
  for (const container of live.splice(0))
    releaseNativeScriptContainer(container);
});

function mount<H extends MockView>(host: H) {
  const container = createNativeScriptContainer(
    host as unknown as core.ViewBase,
  );
  live.push(container);
  const dispatched: Array<{ listener: number; data: unknown }> = [];
  container.root = {
    eventScope: <T>(_priority: unknown, run: () => T) => run(),
    dispatchEvent: (id: number, data: unknown) => {
      dispatched.push({ listener: id, data });
    },
  } as unknown as UniversalRoot;
  return {
    container,
    host,
    dispatched,
    apply(...commands: Command[]) {
      const batch: UniversalHostBatch = {
        renderer: 'nativescript',
        version: 1,
        commands,
      };
      nativeScriptDriver.prepareBatch(container, batch, {} as never).apply();
    },
    view<T>(id: number): T {
      return nativeScriptDriver.getPublicInstance(
        container,
        id,
      ) as unknown as T;
    },
  };
}

const texts = (layout: MockLayoutBase) =>
  layout.children.map((child) => (child as MockTextBase).text);

describe('nativeScriptDriver', () => {
  it('builds the view tree from create and insert commands, honouring before', () => {
    const { apply, host, view } = mount(new MockLayoutBase());
    apply(
      create(1, 'stacklayout', { className: 'root' }),
      create(2, 'label', { text: 'a' }),
      create(3, 'label', { text: 'b' }),
      insert(1),
      insert(3, 1),
      insert(2, 1, 3),
    );
    const stack = view<MockLayoutBase>(1);
    expect(host.children).toEqual([stack]);
    expect(stack).toBeInstanceOf(core.StackLayout);
    expect(stack.className).toBe('root');
    expect(texts(stack)).toEqual(['a', 'b']);

    apply(move(2, 1, null));
    expect(texts(stack)).toEqual(['b', 'a']);

    apply(remove(2, 1));
    expect(texts(stack)).toEqual(['b']);
    expect(view<MockView>(2).parent).toBeNull();
  });

  it('folds #text children into the host text', () => {
    const { apply, view } = mount(new MockLayoutBase());
    apply(
      create(1, 'label'),
      create(2, '#text', { value: 'Hello' }),
      create(3, '#text', { value: ' world' }),
      insert(1),
      insert(2, 1),
      insert(3, 1),
    );
    const label = view<MockTextBase>(1);
    expect(label.text).toBe('Hello world');

    apply(update(3, { value: '!' }));
    expect(label.text).toBe('Hello!');

    apply(remove(2, 1));
    expect(label.text).toBe('!');

    apply(remove(3, 1));
    expect(label.text).toBe('');
  });

  it('merges update props over the create snapshot', () => {
    const { apply, view } = mount(new MockLayoutBase());
    apply(create(1, 'label', { row: 2, text: 'a' }), insert(1));
    apply(update(1, { text: 'b' }));
    const label = view<MockTextBase & { row: number }>(1);
    expect(label.text).toBe('b');
    expect(label.row).toBe(2);
  });

  it('maps className and style onto the view', () => {
    const { apply, view } = mount(new MockLayoutBase());
    apply(
      create(1, 'label', { className: 'title', style: 'color: red' }),
      insert(1),
    );
    const label = view<MockTextBase>(1);
    expect(label.className).toBe('title');
    expect(label.inlineStyle).toBe('color: red');

    apply(update(1, { className: null, style: { color: 'blue' } }));
    expect(label.className).toBe(core.unsetValue);
    expect(label.style.color).toBe('blue');
  });

  it('dispatches view events to the root and detaches removed listeners', () => {
    const { apply, view, dispatched } = mount(new MockLayoutBase());
    apply(create(1, 'button'), insert(1), event(1, 'tap', listener(7)));
    const button = view<MockTextBase>(1);
    const data = { eventName: 'tap', object: button };
    button.notify(data);
    expect(dispatched).toEqual([{ listener: 7, data }]);

    apply(event(1, 'tap', null));
    button.notify(data);
    expect(dispatched).toHaveLength(1);
  });

  it('mutes the change event a prop write provokes, but not an edit', () => {
    const { apply, view, dispatched } = mount(new MockLayoutBase());
    apply(
      create(1, 'textfield', { text: 'a' }),
      insert(1),
      event(1, 'textChange', listener(9)),
    );
    const field = view<MockTextBase>(1);
    apply(update(1, { text: 'b' }));
    expect(field.text).toBe('b');
    expect(dispatched).toEqual([]);

    field.text = 'c';
    expect(dispatched).toEqual([
      {
        listener: 9,
        data: expect.objectContaining({ eventName: 'textChange', value: 'c' }),
      },
    ]);
  });

  it('defers events raised while a batch is applying', async () => {
    class LoadingLayout extends MockLayoutBase {
      override insertChild(child: MockView, index: number): void {
        super.insertChild(child, index);
        child.notify({ eventName: 'loaded', object: child });
      }
    }
    const { apply, dispatched } = mount(new LoadingLayout());
    apply(create(1, 'label'), event(1, 'loaded', listener(3)), insert(1));
    expect(dispatched).toHaveLength(0);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].listener).toBe(3);
  });

  it('collapses hidden hosts', () => {
    const { apply, view } = mount(new MockLayoutBase());
    apply(create(1, 'label'), insert(1), {
      op: 'visibility',
      id: 1,
      state: 'hidden',
    });
    expect(view<MockView>(1).visibility).toBe('collapse');
    apply({ op: 'visibility', id: 1, state: 'visible' });
    expect(view<MockView>(1).visibility).toBe('visible');
  });

  it('hosts a single child in a ContentView', () => {
    const { apply, view } = mount(new MockLayoutBase());
    apply(create(1, 'scrollview'), create(2, 'label'), insert(1), insert(2, 1));
    const scroll = view<MockContentView>(1);
    const label = view<MockView>(2);
    expect(scroll.content).toBe(label);

    apply(remove(2, 1));
    expect(scroll.content).toBeNull();
  });

  it('assigns hostSlot children to the parent property', () => {
    class SlotHost extends MockLayoutBase {
      mainContent: MockView | null = null;
    }
    registerElement('slothost', SlotHost as unknown as ElementConstructor);
    const { apply, view } = mount(new MockLayoutBase());
    apply(
      create(1, 'slothost'),
      create(2, 'label', { hostSlot: 'mainContent' }),
      insert(1),
      insert(2, 1),
    );
    const slotHost = view<SlotHost>(1);
    expect(slotHost.mainContent).toBe(view<MockView>(2));
    expect(slotHost.children).toHaveLength(0);

    apply(remove(2, 1));
    expect(slotHost.mainContent).toBeNull();
  });

  it('nests formatted strings and spans', () => {
    const { apply, view } = mount(new MockLayoutBase());
    apply(
      create(1, 'label'),
      create(2, 'formattedstring'),
      create(3, 'span', { text: 'x' }),
      insert(1),
      insert(2, 1),
      insert(3, 2),
    );
    const label = view<MockTextBase>(1);
    const formatted = view<MockFormattedString>(2);
    expect(label.formattedText).toBe(formatted);
    expect(formatted.spans).toEqual([view(3)]);

    apply(remove(3, 2), remove(2, 1));
    expect(formatted.spans).toEqual([]);
    expect(label.formattedText).toBeNull();
  });

  it('sets an ActionBar child as its titleView', () => {
    const { apply, view } = mount(new MockLayoutBase());
    apply(create(1, 'actionbar'), create(2, 'label'), insert(1), insert(2, 1));
    expect(view<core.ActionBar>(1).titleView).toBe(view(2));
  });

  it('recreate swaps a node for another type in place', () => {
    const { apply, view } = mount(new MockLayoutBase());
    apply(
      create(1, 'stacklayout'),
      create(2, 'label', { text: 'a' }),
      create(3, 'label', { text: 'c' }),
      insert(1),
      insert(2, 1),
      insert(3, 1),
    );
    const previous = view<MockTextBase>(2);
    apply({ op: 'recreate', id: 2, type: 'button', props: { text: 'b' } });
    const stack = view<MockLayoutBase>(1);
    expect(stack.children[0]).toBeInstanceOf(core.Button);
    expect(texts(stack)).toEqual(['b', 'c']);
    expect(previous.parent).toBeNull();
  });

  it('recreates live views when a tag is re-registered', () => {
    const { apply, view, dispatched } = mount(new MockLayoutBase());
    apply(
      create(1, 'stacklayout'),
      create(2, 'label', { className: 'x' }),
      create(3, '#text', { value: 'hi' }),
      create(4, 'label', { text: 'z' }),
      insert(1),
      insert(2, 1),
      insert(3, 2),
      insert(4, 1),
      event(2, 'tap', listener(5)),
    );
    const previous = view<MockTextBase>(2);
    class LabelNext extends MockTextBase {}
    registerElement('label', LabelNext as unknown as ElementConstructor);
    try {
      const next = view<MockTextBase>(2);
      expect(next).not.toBe(previous);
      expect(next).toBeInstanceOf(LabelNext);
      expect(next.className).toBe('x');
      expect(next.text).toBe('hi');
      expect(previous.parent).toBeNull();

      const stack = view<MockLayoutBase>(1);
      expect(stack.children).toEqual([next, view(4)]);
      expect(texts(stack)).toEqual(['hi', 'z']);

      next.notify({ eventName: 'tap', object: next });
      expect(dispatched.map((entry) => entry.listener)).toEqual([5]);
    } finally {
      registerElement('label', core.Label as unknown as ElementConstructor);
    }
    expect(view<MockTextBase>(2)).toBeInstanceOf(core.Label);
  });

  it('forgets destroyed nodes', () => {
    const { apply } = mount(new MockLayoutBase());
    apply(create(1, 'label'), { op: 'destroy', id: 1 });
    expect(() => apply(update(1, {}))).toThrow(/unknown host 1/);
  });

  it('rejects batches for another renderer and unknown tags', () => {
    const { apply, container } = mount(new MockLayoutBase());
    const batch: UniversalHostBatch = {
      renderer: 'dom',
      version: 1,
      commands: [],
    };
    expect(() =>
      nativeScriptDriver.prepareBatch(container, batch, {} as never),
    ).toThrow(/does not match/);
    expect(() => apply(create(1, 'nope'))).toThrow(
      /<nope> is not a registered element/,
    );
  });

  it('classifies handler props as discrete host events', () => {
    expect(nativeScriptDriver.events?.classify('onTap')).toEqual({
      type: 'tap',
      priority: 'discrete',
    });
    expect(nativeScriptDriver.events?.classify('onLoaded')).toEqual({
      type: 'loaded',
      priority: 'discrete',
    });
    expect(nativeScriptDriver.events?.classify('text')).toBeNull();
  });
});
