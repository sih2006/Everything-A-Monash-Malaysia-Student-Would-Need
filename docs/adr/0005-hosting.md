# ADR-0005: Where the app is hosted

## Status

Proposed, with **no decision yet**. This record sets out the options so the owner can choose. Nothing has been built for any of them.

## Date

2026-11-16

## Context

The app runs on the owner's laptop ([ADR-0002](0002-local-first-stack.md)). To use it on a phone away from home it has to be online, with HTTPS and a login.

What matters:

- Free tiers only, with a spending alert.
- It is a portfolio project, so the hosting should show something worth talking about.
- The data is personal: marks, money and health.
- The backend is one Node program, a SQLite file and a C++ program it starts.

## Options

### Option 1: AWS, serverless (Lambda, DynamoDB, Cognito, S3, CloudFront)

- Pros: the original plan. Pay per request, so close to free at one user. Shows infrastructure as code, least privilege and DynamoDB data design.
- Cons: the most work: a new storage layer, the engine packaged for Lambda, a login, and CDK code. DynamoDB is designed very differently from SQL.

### Option 2: AWS, one small server (Lightsail or EC2)

- Pros: the app runs as it is. An afternoon of work.
- Cons: a machine that runs all the time, which costs money once any free credit ends. Less to show.

### Option 3: Supabase (Postgres, login and functions in one service)

- Pros: Postgres is close to the SQLite the app uses now, so the storage layer is a small change. Login is included. Generous free tier.
- Cons: the Node backend and the C++ engine still need somewhere to run, because Supabase functions cannot start a native program. So it needs a second host as well.

### Option 4: Stay local

- Pros: no cost, no account, and the data never leaves the laptop.
- Cons: the phone only works on home Wi-Fi with the laptop on.

## Decision

Not made. The recommendation is **Option 1**, because it is what the project set out to demonstrate and it is the cheapest to leave running. Option 4 is a fine answer too if daily use on the laptop is enough for now.

## What the owner needs to decide

1. Which option.
2. Whether a login for one person is enough, or whether the app should be ready for more users later.

## Consequences

Once a choice is made, this record is updated with the decision and its consequences, and the matching tasks in [next-tasks.md](../handoff/next-tasks.md) (D3) can start. The steps for options 1 and 2 are in [aws-setup.md](../handoff/aws-setup.md).
