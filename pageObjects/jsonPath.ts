/**
 * Walks arbitrary JSON depth-first and returns the first `jobId` value found.
 */
export function pickFirstJobId (node: unknown): string | number | null {
    if (node == null) {
        return null;
    }
    if (typeof node === 'object' && !Array.isArray(node)) {
        const o = node as Record<string, unknown>;
        if ('jobId' in o && o.jobId != null) {
            const v = o.jobId;
            if (typeof v === 'string' || typeof v === 'number') {
                return v;
            }
        }
        for (const v of Object.values(o)) {
            const found = pickFirstJobId(v);
            if (found != null) {
                return found;
            }
        }
    }
    if (Array.isArray(node)) {
        for (const v of node) {
            const found = pickFirstJobId(v);
            if (found != null) {
                return found;
            }
        }
    }

    return null;
}
