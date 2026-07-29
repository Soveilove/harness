/**
 * Project Commands
 * init     - New project: create structure + seed knowledge based on tech stack
 * onboard  - Existing project: scan codebase, detect stack, bootstrap knowledge
 * status   - Show current project status
 */
import { container, TOKENS } from '../../providers/container.js';
import { KnowledgeStore } from '../../knowledge/store.js';
import { ProjectScanner } from '../../config/scanner.js';
import { generateSeeds, seedsToEntries } from '../../config/tech-stack.js';
function getStorage() {
    return container.inject(TOKENS.Storage);
}
function getConfig() {
    return container.inject(TOKENS.Config);
}
function getLogger() {
    return container.inject(TOKENS.Logger);
}
function generateId(type, title) {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const hash = Date.now().toString(36).slice(-6);
    return type + '-' + slug + '-' + hash;
}
function printStack(stack) {
    console.log('  Tech Stack:');
    for (const [key, value] of Object.entries(stack)) {
        if (value)
            console.log('    ' + key + ': ' + value);
    }
}
export function registerProjectCommands(program) {
    const project = program.command('project').description('Project management commands');
    // ── init (new project) ──
    project
        .command('init')
        .argument('<path>', 'Project path')
        .option('--blank', 'Blank initialization (no seed knowledge)')
        .option('--name <name>', 'Project name')
        .option('--framework <framework>', 'Tech stack framework (vue/react/svelte/express)')
        .option('--language <language>', 'Tech stack language (typescript/javascript)')
        .option('--state <state>', 'State management (pinia/redux/zustand)')
        .option('--build <build>', 'Build tool (vite/webpack)')
        .action(async (targetPath, opts) => {
        const logger = getLogger();
        const projectName = opts.name || targetPath.split(/[\\/]/).pop() || 'untitled';
        // Build detected stack from options
        const stack = {
            framework: opts.framework,
            language: opts.language,
            state: opts.state,
            build: opts.build,
        };
        console.log('\n  Initializing Sovei project at: ' + targetPath + '\n');
        // Create directory structure
        const dirs = ['specs', 'harness/project/knowledge', 'harness/project/codegraph', 'harness/project/rules', 'harness/templates'];
        const storage = getStorage();
        for (const dir of dirs) {
            await storage.write(dir + '/.gitkeep', '');
            console.log('  · Created ' + dir + '/');
        }
        // Create project.config.json
        const projectConfig = {
            project: { name: projectName, description: 'New project', techStack: stack, started: new Date().toISOString().split('T')[0] },
            workflow: { version: '2.0.0' },
        };
        await storage.write('harness/project/project.config.json', JSON.stringify(projectConfig, null, 2));
        console.log('  · Created harness/project/project.config.json');
        // Create knowledge files
        const knowledgeTypes = ['pitfall', 'rule', 'decision', 'code-map', 'architecture', 'preference', 'constitution'];
        for (const type of knowledgeTypes) {
            await storage.write('harness/project/knowledge/' + type + '.json', '[]');
            console.log('  · Created harness/project/knowledge/' + type + '.json');
        }
        // Seed knowledge based on tech stack (unless --blank)
        if (!opts.blank) {
            const seeds = generateSeeds(stack);
            if (seeds.length > 0) {
                const entries = seedsToEntries(seeds);
                const knowledgeStore = new KnowledgeStore(storage, 'harness/project/knowledge');
                await knowledgeStore.load();
                for (const entry of entries) {
                    const fullEntry = { ...entry, id: generateId(entry.type, entry.title) };
                    knowledgeStore.dispatch({ type: 'ADD', entry: fullEntry });
                }
                await knowledgeStore.persist();
                console.log('  · Seeded ' + seeds.length + ' knowledge entries based on tech stack');
                printStack(stack);
            }
        }
        console.log('\n  ✓ Project initialized.\n');
        console.log('  Next steps:');
        console.log('    1. Edit harness/project/project.config.json');
        if (!opts.blank && stack.framework) {
            console.log('    2. Review seed knowledge: sovei knowledge list');
            console.log('    3. Start a feature: sovei workflow bootstrap 001-my-feature');
        }
        else {
            console.log('    2. Add knowledge: sovei knowledge add --type pitfall --title "..." --content "..."');
            console.log('    3. Start a feature: sovei workflow bootstrap 001-my-feature');
        }
        console.log('');
    });
    // ── onboard (existing project) ──
    project
        .command('onboard')
        .description('Scan an existing project and bootstrap knowledge')
        .option('--depth <n>', 'Max scan depth', '4')
        .action(async (opts) => {
        const storage = getStorage();
        const logger = getLogger();
        const maxDepth = parseInt(opts.depth, 10) || 4;
        console.log('\n  Scanning project for onboarding...\n');
        // Run scanner
        const scanner = new ProjectScanner(storage);
        const result = await scanner.scan(maxDepth);
        // Print detected info
        console.log('  ── Detected Tech Stack ──');
        printStack(result.techStack);
        console.log('');
        console.log('  ── Entry Points ──');
        if (result.entryPoints.length > 0) {
            for (const entry of result.entryPoints) {
                console.log('    · ' + entry);
            }
        }
        else {
            console.log('    (none detected)');
        }
        console.log('');
        console.log('  ── Detected Patterns ──');
        if (result.detectedPatterns.length > 0) {
            for (const pattern of result.detectedPatterns) {
                console.log('    · ' + pattern);
            }
        }
        else {
            console.log('    (none detected)');
        }
        console.log('');
        console.log('  ── Directory Structure (depth ' + maxDepth + ') ──');
        for (const node of result.directoryMap.slice(0, 50)) {
            const indent = '    ' + '  '.repeat(node.depth);
            const icon = node.type === 'dir' ? '[D]' : '[F]';
            const note = node.note ? '  // ' + node.note : '';
            console.log(indent + icon + ' ' + node.path.split('/').pop() + note);
        }
        if (result.directoryMap.length > 50) {
            console.log('    ... and ' + (result.directoryMap.length - 50) + ' more');
        }
        console.log('');
        // Write project.config.json from detected info
        const projectConfig = {
            project: {
                name: result.packageJson?.name || 'onboarded-project',
                description: result.packageJson?.description || 'Onboarded from existing codebase',
                techStack: result.techStack,
                started: result.packageJson?.createdAt || new Date().toISOString().split('T')[0],
            },
            workflow: { version: '2.0.0' },
        };
        await storage.write('harness/project/project.config.json', JSON.stringify(projectConfig, null, 2));
        console.log('  · Updated harness/project/project.config.json');
        // Write generated knowledge entries
        const knowledgeStore = new KnowledgeStore(storage, 'harness/project/knowledge');
        await knowledgeStore.load();
        let added = 0;
        for (const entry of result.generatedKnowledge) {
            const fullEntry = { ...entry, id: generateId(entry.type, entry.title) };
            if (!knowledgeStore.selectById(fullEntry.id)) {
                knowledgeStore.dispatch({ type: 'ADD', entry: fullEntry });
                added++;
            }
        }
        await knowledgeStore.persist();
        console.log('  · Added ' + added + ' knowledge entries (all as candidate)');
        console.log('\n  ✓ Onboarding complete.\n');
        console.log('  Generated knowledge is all candidate lifecycle.');
        console.log('  Review and promote as you verify patterns:');
        console.log('    sovei knowledge list --lifecycle candidate');
        console.log('    sovei knowledge promote <id> --feature <feature> --description "verified"');
        console.log('');
        console.log('  Start tracking work:');
        console.log('    sovei workflow bootstrap 001-first-feature');
        console.log('');
    });
    // ── status ──
    project
        .command('status')
        .description('Show current project status')
        .action(async () => {
        const storage = getStorage();
        const config = getConfig();
        console.log('\n  Sovei Project Status');
        console.log('  ────────────────────────');
        console.log('  Root:        ' + config.rootPath);
        // Read project.config.json for real project info
        const projContent = await storage.read('harness/project/project.config.json');
        if (projContent) {
            try {
                const proj = JSON.parse(projContent);
                console.log('  Project:     ' + proj.project.name);
                console.log('  Description: ' + proj.project.description);
                const stack = proj.project.techStack || {};
                const stackParts = Object.entries(stack).filter(([, v]) => v).map(([k, v]) => k + '=' + v);
                console.log('  Tech Stack:  ' + (stackParts.length ? stackParts.join(', ') : '—'));
                console.log('  Started:     ' + (proj.project.started || '—'));
            }
            catch {
                console.log('  Project:     (invalid config)');
            }
        }
        else {
            console.log('  Project:     (not configured - run "sovei project init" or "sovei project onboard")');
        }
        console.log('  Workflow:    v' + config.workflow.version);
        // List specs
        const specs = await storage.list('specs');
        const realSpecs = specs.filter((s) => s !== '.gitkeep');
        if (realSpecs.length > 0) {
            console.log('');
            console.log('  Active Features:');
            for (const spec of realSpecs) {
                console.log('    · ' + spec);
            }
        }
        // Count knowledge
        const knowledgeFiles = await storage.list(config.knowledgeDir);
        let totalKnowledge = 0;
        const byLifecycle = {};
        for (const file of knowledgeFiles) {
            if (!file.endsWith('.json'))
                continue;
            const content = await storage.read(config.knowledgeDir + '/' + file);
            if (content) {
                try {
                    const entries = JSON.parse(content);
                    totalKnowledge += entries.length;
                    for (const e of entries) {
                        byLifecycle[e.lifecycle] = (byLifecycle[e.lifecycle] || 0) + 1;
                    }
                }
                catch { /* skip */ }
            }
        }
        console.log('  Knowledge:   ' + totalKnowledge + ' entries');
        if (totalKnowledge > 0) {
            const parts = Object.entries(byLifecycle).map(([k, v]) => k + '=' + v);
            console.log('               ' + parts.join(', '));
        }
        // Check workspaces
        const wsContent = await storage.read('harness/project/workspaces.json');
        if (wsContent) {
            try {
                const ws = JSON.parse(wsContent);
                if (ws.workspaces && ws.workspaces.length > 0) {
                    console.log('');
                    console.log('  Workspaces:');
                    for (const w of ws.workspaces) {
                        const icon = w.role === 'hub' ? '★' : '○';
                        console.log('    ' + icon + ' ' + w.id + ' (' + w.role + ') → ' + w.path);
                    }
                }
            }
            catch { /* skip */ }
        }
        console.log('');
    });
}
//# sourceMappingURL=project.js.map