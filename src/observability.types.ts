/**
 * EMF-backed CloudWatch metrics: `record` writes one bare JSON line to stdout
 * and CloudWatch Logs extracts the metric — zero API calls, zero latency.
 */
type CloudWatchObservabilityOptions = {
	adapter: 'cloudwatch'
	cloudwatch: {
		/** CloudWatch metric namespace (e.g. `'MyApp'`). */
		namespace: string
	}
	/** Dimensions attached to every metric (e.g. `env`, `service`). */
	defaultDimensions?: Record<string, string>
}

/**
 * Local adapter: metrics are logged through
 * `@turystack/nestjs-logger` instead of being shipped anywhere.
 */
type LocalObservabilityOptions = {
	adapter: 'local'
	/** Dimensions attached to every metric (e.g. `env`, `service`). */
	defaultDimensions?: Record<string, string>
}

export type ObservabilityModuleOptions =
	| CloudWatchObservabilityOptions
	| LocalObservabilityOptions

export type MetricUnit = 'Count' | 'None' | 'Milliseconds'

/** The record an adapter receives for every emitted metric. */
export type MetricInput = {
	dimensions?: Record<string, string>
	name: string
	unit: MetricUnit
	value: number
}

/** Empty interface — consumer augments via `declare module '@turystack/nestjs-observability'`. */
export interface MetricMap {}

/** Metric names available for {@link MetricsService} — augmented names, or any string. */
export type MetricName = keyof MetricMap extends never
	? string
	: string & keyof MetricMap

/** Dimensions type for the given metric name — augmented shape, or any string record. */
export type MetricDimensions<Name extends string> = Name extends keyof MetricMap
	? MetricMap[Name]['dimensions']
	: Record<string, string>
