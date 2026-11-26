/**
 * `createMutex` — an async mutual-exclusion lock, API-compatible with the
 * widely used async-mutex library:
 *
 *   const mutex = createMutex();
 *   const result = await mutex.runExclusive(async () => { ... });  // serialized
 *   if (!mutex.isLocked()) { ... }
 *   const release = await mutex.acquire();   // manual acquire/release
 *   release();
 *   const release2 = mutex.tryLock();        // undefined when already locked
 *
 * Waiters are served strictly in FIFO order. If a task throws or rejects, the
 * lock is released and the error propagates to its caller only — the mutex
 * stays healthy for the next waiter.
 */
export function createMutex() {
    let locked = false;
    const queue = []; // pending { resolve, reject } — resolve receives a release fn

    function dispatchNext() {
        const next = queue.shift();
        if (next) {
            next.resolve(release);
        }
        else {
            locked = false;
        }
    }

    function release() {
        dispatchNext();
    }

    function acquire() {
        return new Promise((resolve, reject) => {
            if (!locked) {
                locked = true;
                resolve(release);
            }
            else {
                queue.push({ resolve, reject });
            }
        });
    }

    function tryAcquire() {
        if (locked) return undefined;
        locked = true;
        return release;
    }

    async function runExclusive(task) {
        const releaseFn = await acquire();
        try {
            return await task();
        }
        finally {
            releaseFn();
        }
    }

    return {
        /** Alias of acquire(). */
        lock: acquire,
        /** Acquires the lock, resolving to a release function. */
        acquire,
        /** Acquires without waiting: returns a release function, or undefined when locked. */
        tryAcquire,
        /** Alias of tryAcquire(). */
        tryLock: tryAcquire,
        /** Runs `task` while holding the lock; resolves/rejects with the task result. */
        runExclusive,
        /** True while the lock is held. */
        isLocked: () => locked
    };
}
