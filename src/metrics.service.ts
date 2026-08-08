import { Inject, Injectable } from '@nestjs/common'

import type { IObservabilityAdapter } from '@/observability.adapter.interface.js'
import { OBSERVABILITY_ADAPTER } from '@/observability.constants.js'
import type {
	MetricDimensions,
	MetricName,
	MetricUnit,
} from '@/observability.types.js'

/**
 * Fire-and-forget metric emission. Every method is synchronous, returns
 * `void` and never throws — a broken metric backend cannot break the app.
 *
 * Names and dimensions are typed by the {@link MetricMap} registry when the
 * consumer augments it; without augmentation any string name is accepted.
 */
@Injectable()
export class MetricsService {
	constructor(
		@Inject(OBSERVABILITY_ADAPTER)
		private readonly _adapter: IObservabilityAdapter,
	) {}

	/** Emits a counter (`Count`). `value` defaults to `1`. */
	count<Name extends MetricName>(
		name: Name,
		value = 1,
		dimensions?: MetricDimensions<Name>,
	): void {
		this._record(name, value, 'Count', dimensions as Record<string, string>)
	}

	/** Emits a duration in milliseconds (`Milliseconds`). */
	duration<Name extends MetricName>(
		name: Name,
		millis: number,
		dimensions?: MetricDimensions<Name>,
	): void {
		this._record(
			name,
			millis,
			'Milliseconds',
			dimensions as Record<string, string>,
		)
	}

	/** Emits a point-in-time value (`None`). */
	gauge<Name extends MetricName>(
		name: Name,
		value: number,
		dimensions?: MetricDimensions<Name>,
	): void {
		this._record(name, value, 'None', dimensions as Record<string, string>)
	}

	private _record(
		name: string,
		value: number,
		unit: MetricUnit,
		dimensions?: Record<string, string>,
	): void {
		try {
			this._adapter.record({
				dimensions,
				name,
				unit,
				value,
			})
		} catch {
			// Metrics must never throw.
		}
	}
}
