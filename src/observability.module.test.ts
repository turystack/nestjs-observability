import { Test } from '@nestjs/testing'
import { ConfigModule } from '@turystack/nestjs-config'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { getMetrics } from '@/metrics.context.js'
import { MetricsService } from '@/metrics.service.js'
import { OBSERVABILITY_ADAPTER } from '@/observability.constants.js'
import { ObservabilityModule } from '@/observability.module.js'
import { TracingService } from '@/tracing.service.js'

import { CloudWatchAdapter } from '@/cloudwatch/index.js'
import { LocalAdapter } from '@/local/index.js'

afterEach(() => {
	vi.unstubAllEnvs()
})

describe('ObservabilityModule', () => {
	describe('register', () => {
		it('should expose the service and adapter globally', () => {
			const dynamicModule = ObservabilityModule.register({
				adapter: 'local',
			})

			expect(dynamicModule.module).toBe(ObservabilityModule)
			expect(dynamicModule.global).toBe(true)
			expect(dynamicModule.exports).toEqual([
				MetricsService,
				TracingService,
				OBSERVABILITY_ADAPTER,
			])
		})

		it('should build the cloudwatch adapter from plain options', async () => {
			const moduleRef = await Test.createTestingModule({
				imports: [
					ObservabilityModule.register({
						adapter: 'cloudwatch',
						cloudwatch: {
							namespace: 'MyApp',
						},
						defaultDimensions: {
							env: 'test',
						},
					}),
				],
			}).compile()

			expect(moduleRef.get(OBSERVABILITY_ADAPTER)).toBeInstanceOf(
				CloudWatchAdapter,
			)
		})

		it('should build the local adapter from plain options', async () => {
			const moduleRef = await Test.createTestingModule({
				imports: [
					ObservabilityModule.register({
						adapter: 'local',
					}),
				],
			}).compile()

			expect(moduleRef.get(OBSERVABILITY_ADAPTER)).toBeInstanceOf(LocalAdapter)
		})

		it('should resolve options from a config factory', async () => {
			vi.stubEnv('METRICS_NAMESPACE', 'MyApp')

			const moduleRef = await Test.createTestingModule({
				imports: [
					ConfigModule.register({
						envFilePath: false,
						schema: {
							METRICS_NAMESPACE: z.string(),
						},
					}),
					ObservabilityModule.register((config) => ({
						adapter: 'cloudwatch',
						cloudwatch: {
							namespace: config.get('METRICS_NAMESPACE') as string,
						},
					})),
				],
			}).compile()

			expect(moduleRef.get(OBSERVABILITY_ADAPTER)).toBeInstanceOf(
				CloudWatchAdapter,
			)
		})

		it('should reject a config factory without ConfigModule', async () => {
			await expect(
				Test.createTestingModule({
					imports: [
						ObservabilityModule.register((config) => ({
							adapter: 'cloudwatch',
							cloudwatch: {
								namespace: config.get('METRICS_NAMESPACE') as string,
							},
						})),
					],
				}).compile(),
			).rejects.toThrow(
				'requires ConfigModule (@turystack/nestjs-config) to be registered',
			)
		})

		it('should register the MetricsService singleton behind @Measure', async () => {
			const moduleRef = await Test.createTestingModule({
				imports: [
					ObservabilityModule.register({
						adapter: 'local',
					}),
				],
			}).compile()

			const service = moduleRef.get(MetricsService)

			expect(service).toBeInstanceOf(MetricsService)
			expect(getMetrics()).toBe(service)
		})
	})
})
