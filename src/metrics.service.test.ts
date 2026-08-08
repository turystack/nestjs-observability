import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MetricsService } from '@/metrics.service.js'

describe('MetricsService', () => {
	let adapter: {
		record: ReturnType<typeof vi.fn>
	}
	let service: MetricsService

	beforeEach(() => {
		adapter = {
			record: vi.fn(),
		}
		service = new MetricsService(adapter as never)
	})

	it('should emit a Count metric with a default value of 1', () => {
		service.count('OrderCreated')

		expect(adapter.record).toHaveBeenCalledExactlyOnceWith({
			dimensions: undefined,
			name: 'OrderCreated',
			unit: 'Count',
			value: 1,
		})
	})

	it('should emit a Count metric with an explicit value and dimensions', () => {
		service.count('OrderCreated', 5, {
			paymentMethod: 'pix',
		})

		expect(adapter.record).toHaveBeenCalledExactlyOnceWith({
			dimensions: {
				paymentMethod: 'pix',
			},
			name: 'OrderCreated',
			unit: 'Count',
			value: 5,
		})
	})

	it('should emit a None metric for gauge', () => {
		service.gauge('QueueDepth', 42, {
			queue: 'orders',
		})

		expect(adapter.record).toHaveBeenCalledExactlyOnceWith({
			dimensions: {
				queue: 'orders',
			},
			name: 'QueueDepth',
			unit: 'None',
			value: 42,
		})
	})

	it('should emit a Milliseconds metric for duration', () => {
		service.duration('CheckoutLatency', 125)

		expect(adapter.record).toHaveBeenCalledExactlyOnceWith({
			dimensions: undefined,
			name: 'CheckoutLatency',
			unit: 'Milliseconds',
			value: 125,
		})
	})

	it('should swallow adapter errors', () => {
		adapter.record.mockImplementation(() => {
			throw new Error('adapter down')
		})

		expect(() => service.count('Broken')).not.toThrow()
		expect(() => service.gauge('Broken', 1)).not.toThrow()
		expect(() => service.duration('Broken', 1)).not.toThrow()
	})
})
