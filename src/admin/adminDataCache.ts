type Entry = { data?: unknown; stale: boolean; revision: number; pending?: Promise<unknown> }

// Memory only. Each admin provider owns a cache and clears it on account changes.
export class AdminDataCache {
  private entries = new Map<string, Entry>()

  peek<T>(key: string): T | undefined { return this.entries.get(key)?.data as T | undefined }

  set<T>(key: string, data: T) {
    const entry = this.entries.get(key) || { stale: false, revision: 0 }
    entry.data = data; entry.stale = false; entry.revision++
    this.entries.set(key, entry)
  }

  invalidate(prefix: string) {
    for (const [key, entry] of this.entries) {
      if (key.startsWith(prefix)) { entry.stale = true; entry.revision++ }
    }
  }

  clear() { this.entries.clear() }

  async read<T>(key: string, load: () => Promise<T>, force = false): Promise<T> {
    let entry = this.entries.get(key)
    if (!entry) { entry = { stale: true, revision: 0 }; this.entries.set(key, entry) }
    if (entry.pending) return entry.pending as Promise<T>
    if (!force && !entry.stale && entry.data !== undefined) return entry.data as T
    const target = entry, revision = entry.revision
    const pending = load().then(data => {
      if (this.entries.get(key) === target && target.revision === revision) {
        target.data = data; target.stale = false
      }
      // A local save wins over an older in-flight catalog response.
      return (target.revision !== revision && target.data !== undefined ? target.data : data) as T
    }).finally(() => { if (target.pending === pending) target.pending = undefined })
    target.pending = pending
    return pending
  }
}
