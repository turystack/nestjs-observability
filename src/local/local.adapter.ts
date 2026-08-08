import { LoggerService } from '@turystack/nestjs-logger'

import type { IObservabilityAdapter } from '@/observability.adapter.interface.js'
import type { MetricInput } from '@/observability.types.js'

/**
 * Dev/standalone adapter: metrics are logged through
 * `@turystack/nestjs-logger` instead of being shipped to a backend.
 * Errors are swallowed — metrics never throw.
 */
export class LocalAdapter implements IObservabilityAdapter {
	private readonly _defaultDimensions: Record<string, string>
	private readonly _logger = new LoggerService('Metrics')

	constructor(options?: {
		defaultDimensions?: Record<string, string>
	}) {
		this._defaultDimensions = options?.defaultDimensions ?? {}
	}

	record(input: MetricInput): void {
		try {
			this._logger.info(input.name, {
				dimensions: {
					...this._defaultDimensions,
					...input.dimensions,
				},
				unit: input.unit,
				value: input.value,
			})
		} catch {
			// Metrics must never throw.
		}
	}
}
