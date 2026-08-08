import { trace } from '@opentelemetry/api'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { registerTraceContext } from '@/tracing.context.js'
import { TracingService } from '@/tracing.service.js'

afterEach(() => {
	registerTraceContext(undefined)
	vi.restoreAllMocks()
})

describe('TracingService · without an SDK', () => {
	const tracing = new TracingService()

	/**
	 * The OpenTelemetry API returns a no-op tracer until the application
	 * registers an SDK. A library must work — and cost nothing — in that state.
	 */
	it('runs the operation and returns its value', async () => {
		await expect(tracing.span('charge', async () => 'charged')).resolves.toBe(
			'charged',
		)
	})

	it('rethrows a failure untouched — tracing never changes behaviour', async () => {
		await expect(
			tracing.span('charge', async () => {
				throw new Error('gateway down')
			}),
		).rejects.toThrow('gateway down')
	})

	it('reports no active span', () => {
		expect(tracing.activeSpan()).toBeUndefined()
	})

	it('reports no trace id', () => {
		expect(tracing.traceId()).toBeUndefined()
	})

	it('tolerates setAttribute outside a span', () => {
		expect(() => tracing.setAttribute('key', 'value')).not.toThrow()
	})
})

describe('TracingService · with a tracer', () => {
	function createSpan() {
		return {
			end: vi.fn(),
			recordException: vi.fn(),
			setAttribute: vi.fn(),
			setStatus: vi.fn(),
			spanContext: () => ({
				traceId: 'trace-1',
			}),
		}
	}

	function stubTracer(span: ReturnType<typeof createSpan>) {
		vi.spyOn(trace, 'getTracer').mockReturnValue({
			startActiveSpan: ((_name: string, callback: (s: unknown) => unknown) =>
				callback(span)) as never,
		} as never)
	}

	it('closes the span on success', async () => {
		const span = createSpan()
		stubTracer(span)

		await new TracingService().span('charge', async () => 'ok')

		expect(span.end).toHaveBeenCalledTimes(1)
	})

	it('closes the span on failure too', async () => {
		const span = createSpan()
		stubTracer(span)

		await expect(
			new TracingService().span('charge', async () => {
				throw new Error('gateway down')
			}),
		).rejects.toThrow('gateway down')

		expect(span.end).toHaveBeenCalledTimes(1)
	})

	it('records the exception on the span', async () => {
		const span = createSpan()
		stubTracer(span)

		await expect(
			new TracingService().span('charge', async () => {
				throw new Error('gateway down')
			}),
		).rejects.toThrow()

		expect(span.recordException).toHaveBeenCalled()
		expect(span.setStatus).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'gateway down',
			}),
		)
	})

	it('attaches the operation context, so a span joins its log lines', async () => {
		const span = createSpan()
		stubTracer(span)

		registerTraceContext(() => ({
			'turystack.correlation_id': 'req-42',
		}))

		await new TracingService().span('charge', async () => 'ok')

		expect(span.setAttribute).toHaveBeenCalledWith(
			'turystack.correlation_id',
			'req-42',
		)
	})

	it('lets an explicit attribute win over the ambient one', async () => {
		const span = createSpan()
		stubTracer(span)

		registerTraceContext(() => ({
			region: 'ambient',
		}))

		await new TracingService().span('charge', async () => 'ok', {
			region: 'explicit',
		})

		expect(span.setAttribute).toHaveBeenCalledWith('region', 'explicit')
		expect(span.setAttribute).not.toHaveBeenCalledWith('region', 'ambient')
	})

	it('exposes the trace id for stitching logs to a trace', () => {
		const span = createSpan()
		vi.spyOn(trace, 'getActiveSpan').mockReturnValue(span as never)

		expect(new TracingService().traceId()).toBe('trace-1')
	})
})
