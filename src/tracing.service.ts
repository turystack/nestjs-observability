import { Injectable } from '@nestjs/common'
import { type Span, SpanStatusCode, trace } from '@opentelemetry/api'

import type { MetricDimensions, MetricName } from '@/observability.types.js'
import { currentTraceContext } from '@/tracing.context.js'

/** Scope name every span of this library is recorded under. */
const TRACER_NAME = '@turystack/nestjs-observability'

/**
 * Distributed tracing over the OpenTelemetry API.
 *
 * Only `@opentelemetry/api` is used — never the SDK. That is the contract for
 * an instrumenting library: the application installs and configures the SDK
 * and picks the exporter, and until it does, every call here is a no-op. So a
 * service that never enables tracing pays nothing and needs no flag.
 *
 * @example
 * ```ts
 * await this.tracing.span('charge-payment', async () => {
 *   return this.gateway.charge(input)
 * })
 * ```
 */
@Injectable()
export class TracingService {
	private get _tracer() {
		return trace.getTracer(TRACER_NAME)
	}

	/** The span in flight, when the application configured an SDK. */
	activeSpan(): Span | undefined {
		return trace.getActiveSpan()
	}

	/**
	 * Runs `operation` inside a span.
	 *
	 * The span is closed on both paths, and a failure is recorded on it and
	 * rethrown untouched — tracing never changes behaviour.
	 */
	async span<T>(
		name: string,
		operation: (span: Span) => Promise<T> | T,
		attributes?: Record<string, string>,
	): Promise<T> {
		return this._tracer.startActiveSpan(name, async (span) => {
			// The correlation id ties the span to the logs of the same operation:
			// without it, a trace and its log lines cannot be joined.
			for (const [key, value] of Object.entries({
				...currentTraceContext(),
				...attributes,
			})) {
				span.setAttribute(key, value)
			}

			try {
				const result = await operation(span)

				span.setStatus({
					code: SpanStatusCode.OK,
				})

				return result
			} catch (error) {
				span.recordException(error as Error)
				span.setStatus({
					code: SpanStatusCode.ERROR,
					message: error instanceof Error ? error.message : String(error),
				})

				throw error
			} finally {
				span.end()
			}
		})
	}

	/** Adds an attribute to the span in flight, when there is one. */
	setAttribute(key: string, value: string): void {
		this.activeSpan()?.setAttribute(key, value)
	}

	/**
	 * Correlation id of the trace in flight, for stitching a log line to a
	 * trace in the backend.
	 */
	traceId(): string | undefined {
		return this.activeSpan()?.spanContext().traceId
	}
}

export type { MetricDimensions, MetricName }
