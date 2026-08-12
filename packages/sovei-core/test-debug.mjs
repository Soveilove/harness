import { MemoryStorage } from './dist/index.js';
import { summaryFeature } from './dist/cli/commands/feature.js';

const storage = new MemoryStorage();
const featurePath = 'specs/wip-feature';
storage.write(
  `${featurePath}/workflow-state.yaml`,
  'featureId: "wip-feature"\nstatus: in_progress\ncurrentStage: "grill"\nriskLevel: S1\ncompletedStages:\n  - "load"\nnextStage: "spec"\nupdatedAt: "2026-08-11T00:00:00.000Z"\nreopenedStages: []\nblockers: []\ncompletedTaskIds: []\nactiveChangeId: null\n',
);
storage.write(
  `${featurePath}/workflow-events.jsonl`,
  '{"timestamp":"2026-08-11T00:00:00.000Z","event":{"type":"BOOTSTRAP","featureId":"wip-feature"}}\n'
    + '{"timestamp":"2026-08-11T00:00:01.000Z","event":{"type":"STAGE_PREPARED","stage":"load"}}\n'
    + '{"timestamp":"2026-08-11T00:00:02.000Z","event":{"type":"STAGE_COMPLETE","stage":"load","artifacts":["load-summary.md"]}}\n',
);
storage.write(`${featurePath}/load-summary.md`, '# Load Summary — wip-feature\n\n探索中。\n');

const markdown = await summaryFeature(storage, featurePath, 'wip-feature', false);
console.log('=== MARKDOWN ===');
console.log(markdown);
console.log('=== includes 1/12:', markdown.includes('阶段进度: 1/12'));
console.log('=== includes 未提供明确需求描述:', markdown.includes('未提供明确需求描述'));
console.log('=== includes 无决策条目:', markdown.includes('无决策条目'));
