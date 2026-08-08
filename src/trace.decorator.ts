import { getTracing } from '@/tracing.context.registry.js'

/**
 * Method decorator that runs the wrapped call inside a span.
 *
 * Mirrors {@link Measure}: the {@link TracingService} is resolved lazily from
 * the module singleton, so decorated classes need no injection — only
 * `ObservabilityModule.register()` in the app root.
 *
 * A no-op until the application configures an OpenTelemetry SDK.
 *
 * @example
 * ```ts
 * @Trace('charge-payment')
 * async charge(input: ChargeInput) { ... }
 * ```
 */
export function Trace(name: string, attributes?: Record<string, string>) {
	return (
		_target: object,
		_propertyKey: string | symbol,
		descriptor: PropertyDescriptor,
	): PropertyDescriptor => {
		const original = descriptor.value as (...args: unknown[]) => unknown

		descriptor.value = function (this: unknown, ...args: unknown[]) {
			return getTracing().span(
				name,
				() => original.apply(this, args) as never,
				attributes,
			)
		}

		return descriptor
	}
}
