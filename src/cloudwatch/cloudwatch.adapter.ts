import type { IObservabilityAdapter } from '@/observability.adapter.interface.js'
import type { MetricInput } from '@/observability.types.js'

/**
 * CloudWatch adapter built on EMF (Embedded Metric Format).
 *
 * Each `record` writes ONE bare JSON line straight to stdout — never through
 * a logger, which would wrap the line and break EMF parsing. CloudWatch Logs
 * extracts the metric from the envelope, so emitting costs zero API calls
 * and zero request latency. Errors are swallowed — metrics never throw.
 */
export class CloudWatchAdapter implements IObservabilityAdapter {
	private readonly _defaultDimensions: Record<string, string>
	private readonly _namespace: string

	constructor(options: {
		defaultDimensions?: Record<string, string>
		namespace: string
	}) {
		this._defaultDimensions = options.defaultDimensions ?? {}
		this._namespace = options.namespace
	}

	record(input: MetricInput): void {
		try {
			const envelope = {
				_aws: {
					CloudWatchMetrics: [
						{
							Dimensions: this._dimensionSets(input),
							Metrics: [
								{
									Name: input.name,
									Unit: input.unit,
								},
							],
							Namespace: this._namespace,
						},
					],
					Timestamp: Date.now(),
				},
				...this._defaultDimensions,
				...input.dimensions,
				[input.name]: input.value,
			}

			process.stdout.write(`${JSON.stringify(envelope)}\n`)
		} catch {
			// Metrics must never throw.
		}
	}

	private _dimensionSets(input: MetricInput): string[][] {
		const defaultKeys = Object.keys(this._defaultDimensions)
		const metricKeys = Object.keys(input.dimensions ?? {})

		if (metricKeys.length === 0) {
			return [
				defaultKeys,
			]
		}

		if (defaultKeys.length === 0) {
			return [
				metricKeys,
			]
		}

		return [
			defaultKeys,
			[
				...defaultKeys,
				...metricKeys,
			],
		]
	}
}
