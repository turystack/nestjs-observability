import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CloudWatchAdapter } from '@/cloudwatch/cloudwatch.adapter.js'

const NOW = new Date('2026-07-18T12:00:00.000Z')

describe('CloudWatchAdapter', () => {
	let write: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(NOW)
		write = vi
			.spyOn(process.stdout, 'write')
			.mockImplementation(() => true) as never
	})

	afterEach(() => {
		write.mockRestore()
		vi.useRealTimers()
	})

	const writtenLine = (): string => write.mock.calls[0]?.[0] as never

	it('should write the exact EMF envelope with default and metric dimensions', () => {
		const adapter = new CloudWatchAdapter({
			defaultDimensions: {
				env: 'prod',
				service: 'orders',
			},
			namespace: 'MyApp',
		})

		adapter.record({
			dimensions: {
				paymentMethod: 'pix',
			},
			name: 'OrderCreated',
			unit: 'Count',
			value: 1,
		})

		expect(write).toHaveBeenCalledTimes(1)
		expect(JSON.parse(writtenLine())).toEqual({
			_aws: {
				CloudWatchMetrics: [
					{
						Dimensions: [
							[
								'env',
								'service',
							],
							[
								'env',
								'service',
								'paymentMethod',
							],
						],
						Metrics: [
							{
								Name: 'OrderCreated',
								Unit: 'Count',
							},
						],
						Namespace: 'MyApp',
					},
				],
				Timestamp: NOW.getTime(),
			},
			env: 'prod',
			OrderCreated: 1,
			paymentMethod: 'pix',
			service: 'orders',
		})
	})

	it('should use only the default-dimension set when the metric has no dimensions', () => {
		const adapter = new CloudWatchAdapter({
			defaultDimensions: {
				env: 'prod',
			},
			namespace: 'MyApp',
		})

		adapter.record({
			name: 'QueueDepth',
			unit: 'None',
			value: 42,
		})

		const envelope = JSON.parse(writtenLine())

		expect(envelope._aws.CloudWatchMetrics[0].Dimensions).toEqual([
			[
				'env',
			],
		])
		expect(envelope.QueueDepth).toBe(42)
	})

	it('should use an empty dimension set without default or metric dimensions', () => {
		const adapter = new CloudWatchAdapter({
			namespace: 'MyApp',
		})

		adapter.record({
			name: 'Heartbeat',
			unit: 'Count',
			value: 1,
		})

		expect(
			JSON.parse(writtenLine())._aws.CloudWatchMetrics[0].Dimensions,
		).toEqual([
			[],
		])
	})

	it('should use only the metric-dimension set without default dimensions', () => {
		const adapter = new CloudWatchAdapter({
			namespace: 'MyApp',
		})

		adapter.record({
			dimensions: {
				status: 'error',
			},
			name: 'JobRun',
			unit: 'Milliseconds',
			value: 125,
		})

		const envelope = JSON.parse(writtenLine())

		expect(envelope._aws.CloudWatchMetrics[0].Dimensions).toEqual([
			[
				'status',
			],
		])
		expect(envelope._aws.CloudWatchMetrics[0].Metrics).toEqual([
			{
				Name: 'JobRun',
				Unit: 'Milliseconds',
			},
		])
		expect(envelope.JobRun).toBe(125)
		expect(envelope.status).toBe('error')
	})

	it('should write a single JSON line that round-trips', () => {
		const adapter = new CloudWatchAdapter({
			defaultDimensions: {
				env: 'staging',
			},
			namespace: 'MyApp',
		})

		adapter.record({
			name: 'PingLatency',
			unit: 'Milliseconds',
			value: 7,
		})

		const line = writtenLine()

		expect(line.endsWith('\n')).toBe(true)
		expect(line.slice(0, -1)).not.toContain('\n')
		expect(JSON.stringify(JSON.parse(line))).toBe(line.slice(0, -1))
	})

	it('should not throw when the stdout write throws', () => {
		write.mockImplementation(() => {
			throw new Error('EPIPE')
		})

		const adapter = new CloudWatchAdapter({
			namespace: 'MyApp',
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
