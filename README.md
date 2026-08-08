# @turystack/nestjs-observability

CloudWatch-first metrics for NestJS via EMF: fire-and-forget counters, gauges, durations, and a @Measure decorator. Local adapter built-in.

## Installation

```bash
pnpm add @turystack/nestjs-observability
```

### Peer dependencies

The host application provides these:

```bash
pnpm add @nestjs/common @nestjs/core @turystack/nestjs-config @turystack/nestjs-logger reflect-metadata
```

Optional — install only the ones whose feature you use:

```bash
pnpm add @opentelemetry/api @turystack/nestjs-context
```

## Documentation

Options, API reference and examples:

**https://tury.dev/libs/nestjs-observability**

## Development

```bash
pnpm install
pnpm typecheck
pnpm check
pnpm test
pnpm build
```
