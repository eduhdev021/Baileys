/**
 * `createQueue` — a promise task queue with bounded concurrency:
 *
 *   const queue = createQueue(1);            // serialize tasks (default is 1)
 *   const result = await queue.add(async () => { ... });
 *   await queue.push(fn);                    // push is an alias of add
 *
 * Tasks run in FIFO order; at most `concurrency` tasks are active at a time.
 * A rejected task only rejects its own promise — the queue keeps working.
 */
export function createQueue(concurrency = 1) {
    const limit = Number.isFinite(concurrency) && concurrency > 0 ? Math.floor(concurrency) : 1;
    const pending = []; // waiting tasks in FIFO order
    let active = 0;

    function pump() {
        while (active < limit && pending.length > 0) {
            const { task, resolve, reject } = pending.shift();
            active++;
            Promise.resolve()
                .then(task)
                .then(resolve, reject)
                .finally(() => {
                    active--;
                    pump();
                });
        }
    }

    function add(task) {
        if (typeof task !== 'function') {
            return Promise.reject(new TypeError('queue.add() expects a function'));
        }
        return new Promise((resolve, reject) => {
            pending.push({ task, resolve, reject });
            pump();
        });
    }

    return {
        add,
        push: add
    };
}
