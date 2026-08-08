# Observability

CloudWatch-first metrics for NestJS via EMF (Embedded Metric Format): fire-and-forget counters, gauges and durations, plus a `@Measure` decorator. Local (logger-backed) is the built-in dev adapter.

## The idea

**Metrics are logs.** With EMF, emitting a metric is writing one bare JSON line to stdout — CloudWatch Logs extracts the metric from the envelope. Zero API calls, zero SDK, zero latency in the request path. Every emission is synchronous, returns `void` and never throws: a broken metric backend cannot break the app.

- **Lambda** works natively: stdout goes to CloudWatch Logs, and metric extraction happens automatically.
- **ECS/EC2** requires the CloudWatch Agent or Fluent Bit shipping container stdout to CloudWatch Logs — the extraction is the same once the lines arrive.

**Dimension cardinality rule.** Every distinct dimension-value combination is a separate CloudWatch metric (and a separate charge). Dimensions are for low-cardinality slicing — `env`, `service`, `domain`, `operation`, `status` — **never ids** (userId, orderId, requestId). Ids belong in logs, not dimensions.

## Setup

```ts
// config.schema.ts
import { defineConfigSchema } from '@turystack/nestjs-config'
import { z } from 'zod'

export const configSchema = defineConfigSchema({
  METRICS_NAMESPACE: z.string(),
  NODE_ENV: z.string(),
})

declare module '@turystack/nestjs-config' {
  interface ConfigSchemaRegistry {
    schema: typeof configSchema
  }
}
```

```ts
// app.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@turystack/nestjs-config'
import { ObservabilityModule } from '@turystack/nestjs-observability'

import { configSchema } from './config.schema.js'

@Module({
  imports: [
    ConfigModule.register({ schema: configSchema }),
    ObservabilityModule.register((config) => ({
      adapter: 'cloudwatch',
      cloudwatch: { namespace: config.get('METRICS_NAMESPACE') },
      defaultDimensions: {
        env: config.get('NODE_ENV'),
        service: 'orders-api',
      },
    })),
  ],
})
export class AppModule {}
```

- `register` also accepts plain options — `{ adapter: 'local' }` for dev/standalone runs logs metrics instead of emitting EMF.
- `defaultDimensions` are merged into every metric and form the first EMF dimension set.
- The module is global: inject `MetricsService` anywhere, no imports needed.

## Typed metric names

Augment `MetricMap` to get typed names and dimensions on `MetricsService` and `@Measure` (mirror of the publisher's event map):

```ts
declare module '@turystack/nestjs-observability' {
  interface MetricMap {
    OrderCreated: { dimensions: { paymentMethod: string } }
  }
}

metrics.count('OrderCreated', 1, { paymentMethod: 'pix' }) // typed
```

Without augmentation any string name is accepted and dimensions are `Record<string, string>`.

## @Measure

```ts
import { Measure } from '@turystack/nestjs-observability'

class CheckoutService {
  @Measure('Checkout', { domain: 'orders' })
  async run(input: CheckoutInput) {
    // ...
  }
}
```

On every call it emits a `duration` (elapsed ms) and a `count` under the metric name, with `status: 'success' | 'error'` merged into the dimensions. Errors are rethrown untouched. Works for async and sync methods; the service is resolved lazily from the module singleton, so the class needs no injection.

## API

| Export | Description |
|---|---|
| `MetricsService.count(name, value = 1, dimensions?)` | Counter (`Count`) |
| `MetricsService.gauge(name, value, dimensions?)` | Point-in-time value (`None`) |
| `MetricsService.duration(name, millis, dimensions?)` | Duration (`Milliseconds`) |
| `@Measure(name, dimensions?)` | Method decorator: duration + count with `status` dimension |
| `ObservabilityModule.register(options \| (config) => options)` | Global registration |
| `MetricMap` / `MetricName` / `MetricDimensions` | Typed-name registry (consumer-augmented) |
| `IObservabilityAdapter` / `OBSERVABILITY_ADAPTER` | Adapter contract + DI token for custom providers |

## Adapters

Emission is abstracted behind `IObservabilityAdapter` (`record(input): void` — synchronous, never throws). To add a backend, implement it and bind to the `OBSERVABILITY_ADAPTER` token.

| Adapter | Notes |
|---|---|
| `'cloudwatch'` | EMF: one bare JSON line per metric on stdout; requires `cloudwatch.namespace`; no AWS SDK |
| `'local'` | Logs metrics via `@turystack/nestjs-logger` under the `Metrics` context — dev/standalone |
