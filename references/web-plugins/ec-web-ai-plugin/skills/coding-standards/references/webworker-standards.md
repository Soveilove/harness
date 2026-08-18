# Web Worker Procedure

## Use When

- 设计或重构 Web Worker。
- 定义主线程和 Worker 之间的消息协议。
- 将高频计算、长耗时任务或后台保活逻辑迁移到 Worker。

## Avoid When

- 任务只是普通异步函数，不需要单独线程。
- 任务运行在服务端，不属于浏览器 Worker 场景。
- 任务只涉及组件或 store，不涉及 Worker 通信。

## Procedures

### Step 1: Confirm Worker Boundaries

1. 先确认任务确实需要 Worker，而不是主线程普通异步逻辑。
2. 只让一个 Worker 负责一类后台能力，不混合多种无关任务。
3. 如果任务还涉及组件或 store 的接入，同时读取对应 reference，避免只设计通信不设计消费方式。

### Step 2: Create Module Structure

1. 将 Worker 功能放在 services 目录下，以独立文件夹组织。
2. 文件夹名称使用 snake_case。
3. 目录至少包含 index.ts、worker.ts 和 type.ts 三个文件。

```text
services/
└── xxx/
    ├── index.ts
    ├── worker.ts
    └── type.ts
```

### Step 3: Define Message Protocol

1. 所有消息使用 command 字段区分命令，使用 payload 传输数据，使用 requestId 关联请求和响应。
2. 共享消息类型统一放在 type.ts，供主线程和 Worker 同时引用。
3. Worker 初始化完成后主动发送 ready 消息给主线程。
4. 协议命名保持明确，避免使用模糊 command。

### Step 4: Build Main-Thread Wrapper

1. 在 index.ts 中封装 Worker 的创建、销毁、消息订阅和命令派发逻辑。
2. 不直接向外暴露原始 Worker 实例，避免调用侧绕过封装。
3. initialize 函数返回 Promise，在 ready 时 resolve，在失败或超时时 reject。
4. 请求型接口内部生成唯一 requestId，并在收到响应时根据 requestId resolve 或 reject。
5. 主线程负责把 Worker 运行所需的浏览器环境信息在 init 阶段传入。

### Step 5: Implement Worker Runtime

1. 在 worker.ts 中接收消息并分发到具体处理函数。
2. 复杂业务逻辑、定时器、连接和内部状态尽量留在 Worker 内部处理。
3. 所有异步操作都要捕获错误，并通过 postMessage 返回错误消息。
4. Worker 不再需要时主动调用 self.close()，避免线程泄漏。

## Error Handling

- 如果主线程等待 ready 超时，显式 reject 初始化 Promise，并清理监听器。
- 如果 Worker 收到未知 command，返回统一 error 消息，不允许静默失败。
- 如果请求响应未按 requestId 成对出现，优先修正协议设计，不要在调用侧堆叠补丁逻辑。

## Main Thread Example

```typescript
let worker: Worker | undefined;
let uniqueId = 0;

export const initWorker = () => {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { name: 'demo-worker' });

    return new Promise<void>((resolve, reject) => {
        const handleReady = (event: MessageEvent<WorkerResponse>) => {
            if (event.data.command === 'ready') {
                worker?.removeEventListener('message', handleReady);
                resolve();
            }
        };

        setTimeout(() => {
            worker?.removeEventListener('message', handleReady);
            reject(new Error('Worker initialization timeout'));
        }, 10000);

        worker?.addEventListener('message', handleReady);
    });
};

export const getUserInfo = (userId: number): Promise<UserInfo> => {
    if (!worker) {
        return Promise.reject(new Error('Worker not initialized'));
    }

    const requestId = ++uniqueId;

    return new Promise((resolve, reject) => {
        const handleMessage = (event: MessageEvent<WorkerResponse>) => {
            if (event.data.requestId === requestId) {
                worker?.removeEventListener('message', handleMessage);

                if (event.data.command === 'getUserInfoSuccess') {
                    resolve(event.data.payload);
                    return;
                }

                if (event.data.command === 'error') {
                    reject(new Error(event.data.payload.message));
                }
            }
        };

        worker.addEventListener('message', handleMessage);
        worker.postMessage({ command: 'getUserInfo', payload: { userId }, requestId });
    });
};
```

## Protocol Example

```typescript
export type WorkerRequest = {
    command: 'init';
} | {
    command: 'getUserInfo';
    requestId: number;
    payload: {
        userId: number;
    };
};

export type WorkerResponse = {
    command: 'ready';
} | {
    command: 'getUserInfoSuccess';
    requestId: number;
    payload: UserInfo;
} | {
    command: 'error';
    requestId?: number;
    payload: {
        message: string;
    };
};
```

## Worker Example

```typescript
/// <reference lib="webworker" />

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
    try {
        switch (event.data.command) {
            case 'init':
                self.postMessage({ command: 'ready' } as WorkerResponse);
                return;
            case 'getUserInfo':
                self.postMessage({
                    command: 'getUserInfoSuccess',
                    requestId: event.data.requestId,
                    payload: {
                        id: event.data.payload.userId,
                        name: 'Mock User',
                    },
                } as WorkerResponse);
                return;
            default:
                self.postMessage({
                    command: 'error',
                    requestId: 'requestId' in event.data ? event.data.requestId : undefined,
                    payload: { message: `Unknown command: ${event.data.command}` },
                } as WorkerResponse);
        }
    } catch (error) {
        self.postMessage({
            command: 'error',
            requestId: 'requestId' in event.data ? event.data.requestId : undefined,
            payload: { message: error instanceof Error ? error.message : 'Worker error' },
        } as WorkerResponse);
    }
};
```

## Checklist

1. 是否确认任务确实需要 Web Worker，而不是普通异步逻辑。
2. Worker 目录结构是否完整，且位于 services 下的独立目录。
3. 是否在 type.ts 中定义共享消息协议，并包含 command、payload、requestId。
4. 主线程是否通过 index.ts 提供 Promise 化封装，而不是暴露原始 Worker。
5. Worker 是否会主动发送 ready，并在异常时返回统一 error 消息。
6. Worker 生命周期结束时，是否有明确销毁或 self.close() 处理。
