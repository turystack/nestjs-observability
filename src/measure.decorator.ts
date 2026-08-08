import { getMetrics } from '@/metrics.context.js'
import type { MetricDimensions, MetricName } from '@/observability.types.js'

/**
 * Method decorator that measures the wrapped call: on completion it emits a
 * `duration` (elapsed ms) and a `count` under the given metric name, with a
 * `status` dimension of `'success'` or `'error'` merged into `dimensions`.
 * Errors are RETHROWN untouched — measuring never changes behavior.
 *
 * Works for async and sync methods. The {@link MetricsService} is resolved
 * lazily on each call from the module singleton, so decorated classes need
 * no injection — only `ObservabilityModule.register()` in the app root.
 */
export function Measure<Name extends MetricName>(
	name: Name,
	dimensions?: MetricDimensions<Name>,
) {
	return (
		_target: object,
		_propertyKey: string | symbol,
		descriptor: PropertyDescriptor,
	): PropertyDescriptor => {
		const original = descriptor.value as (...args: unknown[]) => unknown

		descriptor.value = function (this: unknown, ...args: unknown[]) {
			const startedAt = Date.now()

			try {
				const result = original.apply(this, args)

				if (result instanceof Promise) {
					return result.then(
						(value) => {
							_emit(name, startedAt, dimensions, 'success')

							return value
						},
						(error) => {
							_emit(name, startedAt, dimensions, 'error')

							throw error
						},
					)
				}

				_emit(name, startedAt, dimensions, 'success')

				return result
			} catch (error) {
				_emit(name, startedAt, dimensions, 'error')

				throw error
			}
		}

		return descriptor
	}
}

function _emit(
	name: string,
	startedAt: number,
	dimensions: Record<string, string> | undefined,
	status: 'error' | 'success',
): void {
	const metrics = getMetrics()
	const merged = {
		...dimensions,
		status,
	}

	metrics.duration(name, Date.now() - startedAt, merged)
	metrics.count(name, 1, merged)
}
