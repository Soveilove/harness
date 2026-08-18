---
title: Use Functional setState Updates
impact: MEDIUM
impactDescription: prevents stale closures and state update bugs
tags: react, hooks, useState, closures
---

## Use Functional setState Updates

When updating state based on the current state value, use the functional update form of setState instead of directly referencing the state variable. This prevents stale closures and reduces state update bugs.

**Incorrect (directly references state value):**

```tsx
function TodoList() {
    const [items, setItems] = useState(initialItems);

    const addItems = (newItems: Item[]) => {
        setItems([...items, ...newItems]);
    };

    const removeItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    return <ItemsEditor items={items} onAdd={addItems} onRemove={removeItem} />;
}
```

Both handlers can read stale `items` in async scenarios and are easy to misuse when update logic becomes more complex.

**Correct (always based on latest state):**

```tsx
function TodoList() {
    const [items, setItems] = useState(initialItems);

    const addItems = (newItems: Item[]) => {
        setItems(curr => [...curr, ...newItems]);
    };

    const removeItem = (id: string) => {
        setItems(curr => curr.filter(item => item.id !== id));
    };

    return <ItemsEditor items={items} onAdd={addItems} onRemove={removeItem} />;
}
```

**Benefits:**

1. **No stale closures** - Always operates on the latest state value
2. **Safer async updates** - Multiple updates compose correctly
3. **Less bug-prone logic** - Avoids accidental reads of old state
4. **Clear intent** - Update clearly depends on previous state

**When to use functional updates:**

- Any setState that depends on the current state value
- In any state update that depends on the previous state
- Event handlers that reference state
- Async operations that update state

**When direct updates are fine:**

- Setting state to a static value: `setCount(0)`
- Setting state from props/arguments only: `setName(newName)`
- State doesn't depend on previous value

**Note:** If your project has [React Compiler](https://react.dev/learn/react-compiler) enabled, the compiler can automatically optimize some cases, but functional updates are still recommended for correctness and to prevent stale closure bugs.
