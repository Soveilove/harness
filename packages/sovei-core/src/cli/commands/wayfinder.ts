import { type Command, Option } from 'commander';
import { InteractionMode, DecisionTicketType, WayfinderRepository } from '../../wayfinder/index.js';
import { getFeaturePath } from '../../config/loader.js';
import type { SoveiConfig } from '../../config/types.js';
import { container, TOKENS } from '../../providers/container.js';
import type { StorageBackend } from '../../storage/types.js';

function dependencies(): { repository: WayfinderRepository; config: SoveiConfig } {
  const storage = container.inject<StorageBackend>(TOKENS.Storage);
  const config = container.inject<SoveiConfig>(TOKENS.Config);
  return { repository: new WayfinderRepository(storage), config };
}

function featurePath(feature: string): string {
  return getFeaturePath(dependencies().config, feature);
}

function list(value?: string): string[] {
  return value ? value.split(',').map((entry) => entry.trim()).filter(Boolean) : [];
}

function actor(options: { actor?: string }): string {
  return options.actor?.trim() || 'agent';
}

export function registerWayfinderCommands(program: Command): void {
  const wayfinder = program.command('wayfinder').description('跨会话大型工作的决策地图');

  wayfinder
   .command('chart')
   .description('绘制决策地图')
   .argument('<feature>', 'Feature ID')
   .requiredOption('--destination <destination>', 'What reaching the end of this map looks like')
    .option('--notes <notes>', 'Standing domain notes and session guidance', '')
    .option('--actor <actor>', 'Actor creating the map')
    .action(async (feature: string, options: { destination: string; notes: string; actor?: string }) => {
      const { repository } = dependencies();
      await repository.chart(featurePath(feature), feature, options.destination, options.notes, actor(options));
      console.log(`\n  Charted Wayfinder map for ${feature}. Add current decision tickets and fog next.\n`);
    });

  wayfinder
   .command('skip')
   .description('小型工作跳过决策地图')
   .argument('<feature>', 'Feature ID')
   .requiredOption('--reason <reason>', 'Why this effort fits in one session without a decision map')
    .option('--actor <actor>', 'Actor recording the decision')
    .action(async (feature: string, options: { reason: string; actor?: string }) => {
      const { repository } = dependencies();
      await repository.skip(featurePath(feature), feature, options.reason, actor(options));
      console.log(`\n  Wayfinder marked not required for ${feature}.\n`);
    });

  wayfinder
   .command('status')
   .description('显示决策地图状态')
   .argument('<feature>', 'Feature ID')
   .action(async (feature: string) => {
      const { repository } = dependencies();
      const state = await repository.getState(featurePath(feature));
      if (!state) throw new Error('Wayfinder map is not initialized');
      const tickets = Object.values(state.tickets);
      const frontier = await repository.frontier(featurePath(feature));
      console.log(`\n  Wayfinder: ${feature}`);
      console.log(`  Destination: ${state.destination || '(not required)'}`);
      if (state.notRequiredReason) console.log(`  Not required: ${state.notRequiredReason}`);
      console.log(`  Tickets: ${tickets.length} total, ${tickets.filter((ticket) => ticket.status === 'open').length} open, ${tickets.filter((ticket) => ticket.status === 'resolved').length} resolved`);
      console.log(`  Fog: ${state.fog.length}`);
      console.log(`  Frontier: ${frontier.length}`);
      console.log(`  Revision: ${state.revision}\n`);
    });

  wayfinder
   .command('frontier')
   .description('显示决策前沿')
   .argument('<feature>', 'Feature ID')
   .action(async (feature: string) => {
      const { repository } = dependencies();
      const frontier = await repository.frontier(featurePath(feature));
      if (!frontier.length) {
        console.log('\n  Frontier is empty.\n');
        return;
      }
      console.log('\n  Decision Frontier\n');
      for (const ticket of frontier) {
        console.log(`  ${ticket.title} (${ticket.id}) [${ticket.type}/${ticket.interaction}]`);
        console.log(`    ${ticket.question}`);
      }
      console.log('');
    });

  const ticket = wayfinder.command('ticket').description('创建决策工单');
  ticket
    .command('add')
    .argument('<feature>', 'Feature ID')
    .requiredOption('--title <title>', 'Human-readable ticket name')
    .requiredOption('--question <question>', 'Decision or investigation this ticket resolves')
    .addOption(new Option('--type <type>', 'research | prototype | grilling | task').choices(DecisionTicketType.options).makeOptionMandatory())
    .addOption(new Option('--interaction <mode>', 'HITL | AFK').choices(InteractionMode.options).makeOptionMandatory())
    .option('--blocked-by <ids>', 'Comma-separated decision ticket IDs')
    .option('--actor <actor>', 'Actor creating the ticket')
    .action(async (feature: string, options: { title: string; question: string; type: string; interaction: string; blockedBy?: string; actor?: string }) => {
      const { repository } = dependencies();
      const created = await repository.addTicket(featurePath(feature), {
        title: options.title,
        question: options.question,
        type: DecisionTicketType.parse(options.type),
        interaction: InteractionMode.parse(options.interaction),
        blockedBy: list(options.blockedBy),
      }, actor(options));
      console.log(`\n  Added decision ticket ${created.title} (${created.id}).\n`);
    });

  const fog = wayfinder.command('fog').description('管理尚不可明确的决策区域');
  fog
    .command('add')
    .argument('<feature>', 'Feature ID')
    .requiredOption('--summary <summary>', 'Loose area to revisit when the frontier advances')
    .option('--actor <actor>', 'Actor adding fog')
    .action(async (feature: string, options: { summary: string; actor?: string }) => {
      const { repository } = dependencies();
      const state = await repository.addFog(featurePath(feature), options.summary, actor(options));
      const created = state.fog[state.fog.length - 1];
      console.log(`\n  Added fog ${created.id}: ${created.summary}\n`);
    });

  fog
    .command('graduate')
    .argument('<feature>', 'Feature ID')
    .argument('<fog-id>', 'Fog ID')
    .requiredOption('--title <title>', 'Human-readable ticket name')
    .requiredOption('--question <question>', 'Now-specifiable decision question')
    .addOption(new Option('--type <type>', 'research | prototype | grilling | task').choices(DecisionTicketType.options).makeOptionMandatory())
    .addOption(new Option('--interaction <mode>', 'HITL | AFK').choices(InteractionMode.options).makeOptionMandatory())
    .option('--blocked-by <ids>', 'Comma-separated decision ticket IDs')
    .option('--actor <actor>', 'Actor graduating the fog')
    .action(async (feature: string, fogId: string, options: { title: string; question: string; type: string; interaction: string; blockedBy?: string; actor?: string }) => {
      const { repository } = dependencies();
      const created = await repository.graduateFog(featurePath(feature), fogId, {
        title: options.title,
        question: options.question,
        type: DecisionTicketType.parse(options.type),
        interaction: InteractionMode.parse(options.interaction),
        blockedBy: list(options.blockedBy),
      }, actor(options));
      console.log(`\n  Graduated ${fogId} into ${created.title} (${created.id}).\n`);
    });

  wayfinder
   .command('claim')
   .description('认领决策工单')
   .argument('<feature>', 'Feature ID')
   .argument('<ticket-id>', 'Decision ticket ID')
   .requiredOption('--actor <actor>', 'Agent or human claiming the ticket')
    .option('--lease <minutes>', 'Claim lease in minutes', '240')
    .action(async (feature: string, ticketId: string, options: { actor: string; lease: string }) => {
      const { repository } = dependencies();
      await repository.claim(featurePath(feature), ticketId, options.actor, Number.parseInt(options.lease, 10));
      console.log(`\n  Claimed decision ticket ${ticketId} as ${options.actor}.\n`);
    });

  wayfinder
   .command('release')
   .description('释放决策工单认领')
   .argument('<feature>', 'Feature ID')
   .argument('<ticket-id>', 'Decision ticket ID')
   .requiredOption('--actor <actor>', 'Current claim owner')
    .requiredOption('--reason <reason>', 'Why the claim is being released')
    .action(async (feature: string, ticketId: string, options: { actor: string; reason: string }) => {
      const { repository } = dependencies();
      await repository.release(featurePath(feature), ticketId, options.actor, options.reason);
      console.log(`\n  Released decision ticket ${ticketId}.\n`);
    });

  wayfinder
   .command('resolve')
   .description('解决决策工单')
   .argument('<feature>', 'Feature ID')
   .argument('<ticket-id>', 'Decision ticket ID')
   .requiredOption('--actor <actor>', 'Current claim owner')
   .requiredOption('--resolution <resolution>', 'Decision answer, not implementation output')
    .option('--evidence <items>', 'Comma-separated evidence references')
    .option('--context <items>', 'Comma-separated context or asset pointers')
    .action(async (feature: string, ticketId: string, options: { actor: string; resolution: string; evidence?: string; context?: string }) => {
      const { repository } = dependencies();
      await repository.resolve(featurePath(feature), ticketId, options.actor, options.resolution, list(options.evidence), list(options.context));
      console.log(`\n  Resolved decision ticket ${ticketId}. Recheck the frontier and fog.\n`);
    });

  wayfinder
   .command('exclude')
   .description('将决策工单排除出范围')
   .argument('<feature>', 'Feature ID')
   .argument('<ticket-id>', 'Decision ticket ID')
   .requiredOption('--reason <reason>', 'Why this ticket lies beyond the Destination')
    .option('--actor <actor>', 'Actor ruling the ticket out of scope')
    .action(async (feature: string, ticketId: string, options: { reason: string; actor?: string }) => {
      const { repository } = dependencies();
      await repository.exclude(featurePath(feature), ticketId, options.reason, actor(options));
      console.log(`\n  Ruled decision ticket ${ticketId} out of scope.\n`);
    });
}
