/**
 * IDE Adapter Registry
 * Maps IDE-specific invocation formats to Sovei CLI commands.
 * Currently the CLI is the primary interface; adapters are for future IDE integration.
 */
export interface IDEAdapter {
    id: string;
    name: string;
    invocationFormat: (stage: string, feature: string) => string;
    reopenFormat: (feature: string, target: string, reason: string) => string;
}
declare class AdapterRegistry {
    private adapters;
    register(adapter: IDEAdapter): void;
    get(id: string): IDEAdapter;
    list(): IDEAdapter[];
}
export declare const adapterRegistry: AdapterRegistry;
export {};
//# sourceMappingURL=registry.d.ts.map