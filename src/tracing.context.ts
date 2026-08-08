/** Supplies attributes attached to every span this library opens. */
export type TraceContextReader = () => Record<string, string> | undefined

let reader: TraceContextReader | undefined

/**
 * Registers the source of per-operation span attributes.
 *
 * Inverted like the logger's enrichment and the database's audit stamping:
 * this package knows nothing about `@turystack/nestjs-context`, and the context
 * package pushes the reader in. A direct dependency would be a cycle, and an
 * optional peer would have to be imported asynchronously — which the
 * synchronous span setup cannot await.
 */
export function registerTraceContext(
	next: TraceContextReader | undefined,
): void {
	reader = next
}

/** Attributes of the operation in flight, empty outside one. */
export function currentTraceContext(): Record<string, string> {
	return reader?.() ?? {}
}
