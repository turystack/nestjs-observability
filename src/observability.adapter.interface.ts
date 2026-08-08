import type { MetricInput } from '@/observability.types.js'

/**
 * Contract for metric backends. `record` is synchronous and fire-and-forget
 * by design — emitting a metric must never add latency or a failure mode to
 * the request path, so implementations must swallow their own errors.
 */
export interface IObservabilityAdapter {
	record(input: MetricInput): void
}
