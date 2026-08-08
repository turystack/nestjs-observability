import type { MetricsService } from '@/metrics.service.js'

let _metrics: MetricsService | undefined

export function registerMetrics(service: MetricsService): void {
	_metrics = service
}

export function getMetrics(): MetricsService {
	if (!_metrics) {
		throw new Error(
			'[ObservabilityModule] metrics not initialized — was ObservabilityModule.register() called?',
		)
	}

	return _metrics
}
