/**
 * Agent Commands
 * sovei agent list
 * sovei agent show <id>
 */

import type { Command } from 'commander';
import { adapterRegistry } from '../../adapters/registry.js';

export function registerAgentCommands(program: Command): void {
  const agent = program.command('agent').description('宿主 Agent 能力画像');

  agent
    .command('list')
    .description('列出所有已注册的 IDE 适配器')
    .action(() => {
      const adapters = adapterRegistry.list();
      console.log('\n  已注册宿主 Agent\n');
      for (const a of adapters) {
        const caps = a.capabilities;
        console.log('  · ' + a.id + ' (' + a.name + ')');
        console.log('    nativeCodeSearch: ' + caps.nativeCodeSearch + '  contextDelivery: ' + caps.contextDelivery + '  toolExecution: ' + caps.toolExecution + '  mcp: ' + caps.mcp + '  cli: ' + caps.cli);
        console.log('    ' + caps.notes);
        console.log('');
      }
    });

  agent
    .command('show')
    .argument('<id>', '适配器 ID')
    .action((id: string) => {
      const a = adapterRegistry.get(id);
      const caps = a.capabilities;
      console.log('\n  ' + a.name + ' (' + a.id + ')\n');
      console.log('  调用格式：    ' + a.invocationFormat('<stage>', '<feature>'));
      console.log('  重开格式：    ' + a.reopenFormat('<feature>', '<target>', '<reason>'));
      console.log('');
      console.log('  能力画像：');
      console.log('    nativeCodeSearch: ' + caps.nativeCodeSearch);
      console.log('    contextDelivery:  ' + caps.contextDelivery);
      console.log('    toolExecution:    ' + caps.toolExecution);
      console.log('    mcp:              ' + caps.mcp);
      console.log('    cli:              ' + caps.cli);
      console.log('    notes:            ' + caps.notes);
      console.log('');
    });
}
