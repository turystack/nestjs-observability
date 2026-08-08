import { LoggerService } from '@turystack/nestjs-logger'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LocalAdapter } from '@/local/local.adapter.js'

vi.mock('@turystack/nestjs-logger', () => {
	class LoggerService {
		static instances: LoggerService[] = []
		context?: string
		info = vi.fn()

		constructor(context?: string) {
			this.context = context
			LoggerService.instances.push(this)
		}
	}

	return {
		LoggerService,
	}
})

type FakeLogger = {
	context?: string
	info: ReturnType<typeof vi.fn>
}

const loggers = () =>
	(
		LoggerService as unknown as {
			instances: FakeLogger[]
		}
	).instances

describe('LocalAdapter', () => {
	beforeEach(() => {
		loggers().length = 0
	})

	it('should log the metric with merged dimensions under the Metrics context', () => {
		const adapter = new LocalAdapter({
			defaultDimensions: {
				env: 'dev',
			},
		})

		adapter.record({
			dimensions: {
				status: 'success',
			},
			name: 'OrderCreated',
			unit: 'Count',
			value: 1,
		})

		const [logger] = loggers()

		expect(logger.context).toBe('Metrics')
		expect(logger.info).toHaveBeenCalledExactlyOnceWith('OrderCreated', {
			dimensions: {
				env: 'dev',
				status: 'success',
			},
			unit: 'Count',
			value: 1,
		})
	})

	it('should log without default dimensions', () => {
		const adapter = new LocalAdapter()

		adapter.record({
			name: 'QueueDepth',
			unit: 'None',
			value: 3,
		})

		expect(loggers()[0].info).toHaveBeenCalledExactlyOnceWith('QueueDepth', {
			dimensions: {},
			unit: 'None',
			value: 3,
		})
	})

	it('should not throw when the logger throws', () => {
		const adapter = new LocalAdapter()

		loggers()[0].info.mockImplementation(() => {
			throw new Error('logger down')
		})

		expect(() =>
			adapter.record({
				name: 'Broken',
				unit: 'Count',
				value: 1,
			}),
		).not.toThrow()
	})
})
