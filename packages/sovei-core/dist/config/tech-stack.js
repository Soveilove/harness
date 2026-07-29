/**
 * Tech Stack Detection & Knowledge Seeding
 *
 * For new projects: generates seed knowledge based on declared tech stack.
 * For existing projects: auto-detects tech stack from manifest files.
 */
/**
 * Detect tech stack from an existing project's manifest files.
 * Reads package.json, tsconfig.json, etc.
 */
export function detectTechStack(packageJson, tsconfig) {
    const stack = {};
    // Language
    if (tsconfig) {
        stack.language = 'TypeScript';
    }
    else if (packageJson?.type === 'module' || packageJson?.dependencies) {
        stack.language = 'JavaScript';
    }
    // Framework
    const deps = { ...(packageJson?.dependencies ?? {}), ...(packageJson?.devDependencies ?? {}) };
    if (deps['vue'] || deps['nuxt']) {
        stack.framework = deps['nuxt'] ? 'Nuxt' : 'Vue';
        if (deps['nuxt'])
            stack.build = 'Nuxt';
    }
    else if (deps['react'] || deps['next']) {
        stack.framework = deps['next'] ? 'Next.js' : 'React';
    }
    else if (deps['svelte'] || deps['@sveltejs/kit']) {
        stack.framework = 'Svelte';
    }
    else if (deps['express']) {
        stack.framework = 'Express';
    }
    else if (deps['fastify']) {
        stack.framework = 'Fastify';
    }
    // State management
    if (deps['pinia'])
        stack.state = 'Pinia';
    else if (deps['vuex'])
        stack.state = 'Vuex';
    else if (deps['@reduxjs/toolkit'] || deps['redux'])
        stack.state = 'Redux';
    else if (deps['zustand'])
        stack.state = 'Zustand';
    // Build tool
    if (deps['vite'])
        stack.build = stack.build ?? 'Vite';
    else if (deps['webpack'])
        stack.build = stack.build ?? 'Webpack';
    else if (deps['rollup'])
        stack.build = stack.build ?? 'Rollup';
    // Package manager
    if (deps) {
        // Can't directly detect from package.json, but lockfile hints
        // This is a heuristic
    }
    // Test runner
    if (deps['vitest'])
        stack.testRunner = 'Vitest';
    else if (deps['jest'])
        stack.testRunner = 'Jest';
    else if (deps['@playwright/test'])
        stack.testRunner = 'Playwright';
    return stack;
}
/**
 * Generate seed knowledge entries based on detected tech stack.
 * All seeds start as 'candidate' - they're common patterns, not verified rules.
 */
export function generateSeeds(stack) {
    const seeds = [];
    const now = new Date().toISOString();
    // ── Constitution seeds (general principles) ──
    seeds.push({
        type: 'constitution',
        title: 'Single Responsibility',
        content: 'Each module/component should have one reason to change. Avoid god components that mix data fetching, business logic, and presentation.',
        tags: ['architecture', 'general'],
    });
    seeds.push({
        type: 'constitution',
        title: 'Explicit Over Implicit',
        content: 'Prefer explicit declarations over magic. Function signatures, type annotations, and configuration should be visible and traceable.',
        tags: ['architecture', 'general'],
    });
    // ── Vue-specific seeds ──
    const fw = (stack.framework || '').toLowerCase();
    if (fw === 'vue' || fw === 'nuxt') {
        seeds.push({
            type: 'pitfall',
            title: 'Reactivity with destructured props',
            content: 'Destructuring reactive props breaks reactivity. Use toRefs() or access props.xxx directly. Vue 3.5+ props destructure is stable but verify your version.',
            tags: ['vue', 'reactivity', 'props'],
        });
        seeds.push({
            type: 'pitfall',
            title: 'Event listener cleanup in onUnmounted',
            content: 'Always remove manually added event listeners (addEventListener, window events, socket subscriptions) in onUnmounted/onScopeDispose to prevent memory leaks.',
            tags: ['vue', 'events', 'memory', 'lifecycle'],
        });
        seeds.push({
            type: 'rule',
            title: 'Composables naming convention',
            content: 'Use use* prefix for composables. Composables should be pure functions that return reactive state, not side-effect containers.',
            tags: ['vue', 'composables', 'naming'],
        });
    }
    // ── React-specific seeds ──
    if (fw === 'react' || fw === 'next.js' || fw === 'next') {
        seeds.push({
            type: 'pitfall',
            title: 'Stale closure in useEffect',
            content: 'Dependencies array must include all values from component scope used inside useEffect. Missing deps cause stale closures and bugs.',
            tags: ['react', 'hooks', 'useEffect'],
        });
        seeds.push({
            type: 'rule',
            title: 'Custom hooks extraction',
            content: 'Extract reusable logic into custom hooks (use* prefix). Hooks should be testable in isolation and not contain JSX.',
            tags: ['react', 'hooks', 'naming'],
        });
    }
    // ── Pinia seeds ──
    if ((stack.state || '').toLowerCase() === 'pinia') {
        seeds.push({
            type: 'rule',
            title: 'Pinia store granularity',
            content: 'One store per domain concern, not per component. Stores should be composable and not depend on each other circularly.',
            tags: ['pinia', 'state', 'architecture'],
        });
    }
    // ── TypeScript seeds ──
    if ((stack.language || '').toLowerCase() === 'typescript') {
        seeds.push({
            type: 'rule',
            title: 'Avoid any, use unknown',
            content: 'Use unknown instead of any for untyped external data. Force narrowing through type guards instead of silencing the compiler.',
            tags: ['typescript', 'types', 'safety'],
        });
        seeds.push({
            type: 'pitfall',
            title: 'Type vs Interface for shared contracts',
            content: 'Use interface for extensible object shapes (declaration merging). Use type for unions, intersections, and utility types.',
            tags: ['typescript', 'types', 'naming'],
        });
    }
    // ── Vite seeds ──
    if ((stack.build || '').toLowerCase() === 'vite') {
        seeds.push({
            type: 'pitfall',
            title: 'Dynamic import with variables in Vite',
            content: 'Vite cannot statically analyze dynamic imports with runtime variables. Use import.meta.glob for dynamic asset loading instead of new URL with variables.',
            tags: ['vite', 'bundling', 'dynamic-import'],
        });
    }
    return seeds;
}
/**
 * Convert seeds to full KnowledgeEntry objects.
 */
export function seedsToEntries(seeds) {
    const now = new Date().toISOString();
    return seeds.map((seed) => ({
        type: seed.type,
        title: seed.title,
        content: seed.content,
        lifecycle: 'candidate',
        evidence: [{
                feature: 'project-init',
                date: now,
                description: 'Auto-generated seed based on tech stack detection',
                verified: false,
            }],
        tags: seed.tags,
        scope: 'project',
        createdAt: now,
        updatedAt: now,
        promotedAt: null,
        deprecatedReason: null,
    }));
}
//# sourceMappingURL=tech-stack.js.map