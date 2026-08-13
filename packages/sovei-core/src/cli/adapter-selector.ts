/**
 * Adapter Selector — 零依赖终端多选器 + --adapters 参数解析。
 *
 * 设计约束（与 Sovei 整体一致）：
 * - 零运行时依赖：仅用 node:readline 的光标控制。
 * - 非交互环境（无 TTY / 管道 / CI）安全回落为 null，绝不阻塞。
 * - 与 adapterRegistry 解耦：候选项由调用方传入 {id, name, contextFile}。
 */

import { clearLine, cursorTo, moveCursor } from 'node:readline';

export interface SelectableAdapter {
  id: string;
  name: string;
  contextFile: string;
}

const ESC = '\x1b';
const KEY_CTRL_C = '\x03';
const KEY_UP = `${ESC}[A`;
const KEY_DOWN = `${ESC}[B`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;

/**
 * 解析 --adapters 选项：逗号分隔 id，支持 all / none。
 * 非法 id 抛错（列出可选值）。
 *
 * @param value 用户传入的原始字符串
 * @param available 已注册的适配器列表
 */
export function parseAdapterOption(value: string, available: SelectableAdapter[]): string[] {
  const validIds = new Set(available.map((a) => a.id));
  const names = value
    .split(',')
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);

  if (names.includes('none')) return [];
  if (names.includes('all')) return available.map((a) => a.id);

  const selected: string[] = [];
  for (const name of names) {
    if (!validIds.has(name)) {
      throw new Error(
        `不支持的适配器：${name}。可选值：${available.map((a) => a.id).join('、')}、all、none`,
      );
    }
    if (!selected.includes(name)) selected.push(name);
  }
  return selected;
}

/**
 * 终端多选：↑/↓ 移动，空格勾选，回车确认，Esc/Ctrl-C 取消。
 * 非 TTY 环境返回 null（调用方据此回落为「不安装 + 打印提示」）。
 *
 * @param adapters 候选适配器
 * @returns 选中的 id 列表；取消或非交互返回 null
 */
export function selectAdapters(adapters: SelectableAdapter[]): Promise<string[] | null> {
  const input = process.stdin;
  const output = process.stdout;
  if (
    !input.isTTY ||
    !output.isTTY ||
    typeof input.setRawMode !== 'function' ||
    adapters.length === 0
  ) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let cursor = 0;
    const selected = new Set<string>();
    const renderedLines = adapters.length + 2;
    const previousRawMode = input.isRaw;

    const render = (initial: boolean): void => {
      if (!initial) moveCursor(output, 0, -renderedLines);
      cursorTo(output, 0);
      clearLine(output, 0);
      output.write('  请选择要注入指令的 IDE 适配器（↑/↓ 移动，空格勾选，回车确认）：\n');
      for (let i = 0; i < adapters.length; i += 1) {
        cursorTo(output, 0);
        clearLine(output, 0);
        const pointer = i === cursor ? '›' : ' ';
        const checked = selected.has(adapters[i].id) ? 'x' : ' ';
        output.write(`  ${pointer} [${checked}] ${adapters[i].name}  (${adapters[i].contextFile})\n`);
      }
      cursorTo(output, 0);
      clearLine(output, 0);
      output.write('  不勾选直接回车 = 跳过适配器安装（仅初始化项目骨架）。\n');
    };

    const finish = (cancelled: boolean): void => {
      input.off('data', onData);
      input.setRawMode(previousRawMode ?? false);
      input.pause();
      output.write(SHOW_CURSOR);
      resolve(cancelled ? null : adapters.filter((a) => selected.has(a.id)).map((a) => a.id));
    };

    const onData = (data: Buffer | string): void => {
      const key = data.toString();
      if (key === KEY_CTRL_C) {
        finish(true);
        process.kill(process.pid, 'SIGINT');
        return;
      }
      if (key === ESC) {
        finish(true);
        return;
      }
      if (key === KEY_UP) {
        cursor = (cursor - 1 + adapters.length) % adapters.length;
        render(false);
        return;
      }
      if (key === KEY_DOWN) {
        cursor = (cursor + 1) % adapters.length;
        render(false);
        return;
      }
      if (key === ' ') {
        const id = adapters[cursor].id;
        if (selected.has(id)) selected.delete(id);
        else selected.add(id);
        render(false);
        return;
      }
      if (key === '\r' || key === '\n') finish(false);
    };

    output.write(HIDE_CURSOR);
    input.setEncoding('utf8');
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
    render(true);
  });
}
