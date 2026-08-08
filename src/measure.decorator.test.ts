import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Measure } from '@/measure.decorator.js'
import { registerMetrics } from '@/metrics.context.js'
import type { MetricsService } from '@/metrics.service.js'

const createMetricsMock = () => ({
	count: vi.fn(),
	duration: vi.fn(),
	gauge: vi.fn(),
})

describe('Measure', () => {
	let metrics: ReturnType<typeof createMetricsMock>

	beforeEach(() => {
		vi.useFakeTimers()
		metrics = createMetricsMock()
		registerMetrics(metrics as unknown as MetricsService)
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('should emit duration and count with status success on an async method', async () => {
		class CheckoutService {
			@Measure('Checkout', {
				domain: 'orders',
			})
			async run(): Promise<string> {
				vi.advanceTimersByTime(25)

				return 'done'
			}
		}

		await expect(new CheckoutService().run()).resolves.toBe('done')

		expect(metrics.duration).toHaveBeenCalledExactlyOnceWith('Checkout', 25, {
			domain: 'orders',
			status: 'success',
		})
		expect(metrics.count).toHaveBeenCalledExactlyOnceWith('Checkout', 1, {
			domain: 'orders',
			status: 'success',
		})
	})

	it('should emit status error and rethrow when an async method rejects', async () => {
		const failure = new Error('payment refused')

		class CheckoutService {
			@Measure('Checkout')
			async run(): Promise<never> {
				vi.advanceTimersByTime(10)

				throw failure
			}
		}

		await expect(new CheckoutService().run()).rejects.toBe(failure)

		expect(metrics.duration).toHaveBeenCalledExactlyOnceWith('Checkout', 10, {
			status: 'error',
		})
		expect(metrics.count).toHaveBeenCalledExactlyOnceWith('Checkout', 1, {
			status: 'error',
		})
	})

	it('should support sync methods and preserve the return value', () => {
		class RankingService {
			@Measure('Rebuild')
			rebuild(factor: number): number {
				vi.advanceTimersByTime(5)

				return factor * 2
			}
		}

		expect(new RankingService().rebuild(21)).toBe(42)

		expect(metrics.duration).toHaveBeenCalledExactlyOnceWith('Rebuild', 5, {
			status: 'success',
		})
		expect(metrics.count).toHaveBeenCalledExactlyOnceWith('Rebuild', 1, {
			status: 'success',
		})
	})

	it('should emit status error and rethrow when a sync method throws', () => {
		const failure = new Error('boom')

		class RankingService {
			@Measure('Rebuild')
			rebuild(): never {
				throw failure
			}
		}

		expect(() => new RankingService().rebuild()).toThrow(failure)

		expect(metrics.duration).toHaveBeenCalledExactlyOnceWith('Rebuild', 0, {
			status: 'error',
		})
		expect(metrics.count).toHaveBeenCalledExactlyOnceWith('Rebuild', 1, {
			status: 'error',
		})
	})

	it('should preserve this binding', () => {
		class CounterService {
			total = 0

			@Measure('Increment')
			increment(): number {
				this.total += 1

				return this.total
			}
		}

		const service = new CounterService()

		expect(service.increment()).toBe(1)
		expect(service.total).toBe(1)
	})

	it('should throw a clear message when metrics were never registered', async () => {
		vi.resetModules()

		const { getMetrics } = await import('@/metrics.context.js')

		expect(() => getMetrics()).toThrow(
			'[ObservabilityModule] metrics not initialized — was ObservabilityModule.register() called?',
		)
	})
})
