import { describe, expectTypeOf, it } from 'vitest'

import type {
	MetricDimensions,
	MetricInput,
	MetricName,
	MetricUnit,
} from '@/observability.types.js'

describe('observability types', () => {
	it('should accept any string name without augmentation', () => {
		expectTypeOf<MetricName>().toEqualTypeOf<string>()
	})

	it('should fall back to a string record for dimensions without augmentation', () => {
		expectTypeOf<MetricDimensions<'OrderCreated'>>().toEqualTypeOf<
			Record<string, string>
		>()
	})

	it('should constrain metric input units', () => {
		expectTypeOf<MetricInput['unit']>().toEqualTypeOf<MetricUnit>()
		expectTypeOf<MetricUnit>().toEqualTypeOf<
			'Count' | 'None' | 'Milliseconds'
		>()
	})
})
