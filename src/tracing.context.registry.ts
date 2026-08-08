import type { TracingService } from '@/tracing.service.js'

let _tracing: TracingService | undefined

export function registerTracing(service: TracingService): void {
	_tracing = service
}

export function getTracing(): TracingService {
	if (!_tracing) {
		throw new Error(
			'[ObservabilityModule] tracing not initialized — was ObservabilityModule.register() called?',
		)
	}

	return _tracing
}
