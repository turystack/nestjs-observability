import { type DynamicModule, Module } from '@nestjs/common'
import { ConfigService } from '@turystack/nestjs-config'

import { registerMetrics } from '@/metrics.context.js'
import { MetricsService } from '@/metrics.service.js'
import type { IObservabilityAdapter } from '@/observability.adapter.interface.js'
import { OBSERVABILITY_ADAPTER } from '@/observability.constants.js'
import type { ObservabilityModuleOptions } from '@/observability.types.js'
import { registerTracing } from '@/tracing.context.registry.js'
import { TracingService } from '@/tracing.service.js'

import { CloudWatchAdapter } from '@/cloudwatch/index.js'
import { LocalAdapter } from '@/local/index.js'

@Module({})
export class ObservabilityModule {
	/**
	 * Registers metrics globally. Register it once in the root module; any
	 * provider can then inject {@link MetricsService} or use `@Measure` —
	 * the singleton behind the decorator is registered here too.
	 *
	 * The `(config) => options` factory form injects the `ConfigService` from
	 * `@turystack/nestjs-config` at boot.
	 */
	static register(
		options:
			| ObservabilityModuleOptions
			| ((config: ConfigService) => ObservabilityModuleOptions),
	): DynamicModule {
		return {
			exports: [
				MetricsService,
				TracingService,
				OBSERVABILITY_ADAPTER,
			],
			global: true,
			module: ObservabilityModule,
			providers: [
				{
					inject: [
						{
							optional: true,
							token: ConfigService,
						},
					],
					provide: OBSERVABILITY_ADAPTER,
					useFactory: (config?: ConfigService) =>
						ObservabilityModule._createAdapter(
							ObservabilityModule._resolveOptions(options, config),
						),
				},
				{
					inject: [
						OBSERVABILITY_ADAPTER,
					],
					provide: MetricsService,
					useFactory: (adapter: IObservabilityAdapter) => {
						const service = new MetricsService(adapter)

						registerMetrics(service)

						return service
					},
				},
				{
					provide: TracingService,
					useFactory: () => {
						const service = new TracingService()

						registerTracing(service)

						return service
					},
				},
			],
		}
	}

	private static _createAdapter(
		options: ObservabilityModuleOptions,
	): IObservabilityAdapter {
		switch (options.adapter) {
			case 'cloudwatch':
				return new CloudWatchAdapter({
					defaultDimensions: options.defaultDimensions,
					namespace: options.cloudwatch.namespace,
				})
			case 'local':
				return new LocalAdapter({
					defaultDimensions: options.defaultDimensions,
				})
		}
	}

	private static _resolveOptions(
		optionsOrFactory:
			| ObservabilityModuleOptions
			| ((config: ConfigService) => ObservabilityModuleOptions),
		config?: ConfigService,
	): ObservabilityModuleOptions {
		if (typeof optionsOrFactory !== 'function') {
			return optionsOrFactory
		}

		if (!config) {
			throw new Error(
				'[ObservabilityModule] register((config) => ...) requires ConfigModule (@turystack/nestjs-config) to be registered',
			)
		}

		return optionsOrFactory(config)
	}
}
