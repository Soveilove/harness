/**
 * Sovei Configuration Types
 * Replaces project.yaml with typed configuration.
 */
export interface SoveiConfig {
    /** Root path of the sovei workspace */
    rootPath: string;
    /** Feature specs directory (relative to root) */
    specsDir: string;
    /** Knowledge directory (relative to root) */
    knowledgeDir: string;
    /** Harness directory (relative to root) */
    harnessDir: string;
    /** Project declaration */
    project: ProjectDeclaration;
    /** Workflow definition */
    workflow: WorkflowConfig;
}
export interface ProjectDeclaration {
    name: string;
    description: string;
    techStack: {
        framework?: string;
        language?: string;
        state?: string;
        build?: string;
    };
    started: string;
}
export interface WorkflowConfig {
    version: string;
    stageOrder: string[];
}
//# sourceMappingURL=types.d.ts.map