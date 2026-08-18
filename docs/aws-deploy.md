# Prodgence — AWS deployment (Frankfurt)

Everything runs in **eu-central-1 (Frankfurt)** for GDPR / EU data residency.

```
VPC (2 AZ, 1 NAT) → RDS PostgreSQL (private, encrypted)
                  → App Runner  (Next.js container from ECR, reaches RDS via a VPC connector)
```

The app is provider-agnostic: it persists to Postgres whenever `PGHOST`/`DATABASE_URL`
is set (see `src/lib/server/pg.ts`), otherwise it falls back to Redis/file. So the
same image runs on AWS, on Vercel, or locally.

## 0. Prerequisites (one-time, you do this)

- An **AWS account**; create an IAM admin user or use SSO.
- Install: **AWS CLI**, **Docker**, **Node 22**.
- `aws configure` → set region **`eu-central-1`**.
- CDK bootstrap (once per account/region):
  ```bash
  cd infra
  npm install
  npx cdk bootstrap aws://<ACCOUNT_ID>/eu-central-1
  ```

## 1. Phase-1 deploy — network + database + registry

```bash
cd infra
npx cdk deploy            # creates VPC, RDS PostgreSQL, ECR repo (no App Runner yet)
```
Note the stack **outputs**: `EcrRepoUri`, `DbEndpoint`, `DbSecretArn`.

## 2. Build & push the first image

```bash
# from the repo root
ACCOUNT=<ACCOUNT_ID>; REGION=eu-central-1
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com
docker build -t prodgence .
docker tag prodgence:latest $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/prodgence:latest
docker push $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/prodgence:latest
```

## 3. Phase-2 deploy — App Runner service

```bash
cd infra
npx cdk deploy -c withService=true      # creates the App Runner service from the pushed image
```
Note the output `ServiceUrl` — open it. The app boots, connects to RDS, seeds a
fresh store in Postgres. Log in with `owner / prodgence` (change it after).

Every later `docker push …:latest` auto-redeploys (App Runner `autoDeploymentsEnabled`).

## 4. Secrets (Anthropic key, later SES/Stripe)

Store secrets in **AWS Secrets Manager**, then add them to the App Runner service:
```bash
aws secretsmanager create-secret --name prodgence/anthropic --secret-string '{"ANTHROPIC_API_KEY":"sk-ant-..."}'
```
Then in `infra/lib/prodgence-stack.ts` add to `runtimeEnvironmentSecrets`:
```ts
{ name: "ANTHROPIC_API_KEY", value: "<that-secret-arn>:ANTHROPIC_API_KEY::" }
```
and `cdk deploy -c withService=true` again.

## 5. Custom domain + HTTPS

App Runner → your service → **Custom domains** → add `app.yourdomain.de` →
it gives DNS records → add them in **Route 53** (or your DNS). ACM issues the TLS
cert automatically. GDPR note: a `.de` domain + Frankfurt hosting keeps everything in DE/EU.

## 6. Cutover, then decommission Vercel

1. Verify the App Runner URL works end-to-end (login, /mes, portal, admin).
2. Point the real domain at App Runner (step 5).
3. Once stable for a few days, delete the Vercel project + its Upstash Redis.
   (The app no longer needs them — data lives in RDS.)

## Scaling (10 → 100 → 1000 users)

- **App Runner**: raise `cpu`/`memory` and max concurrency; it auto-scales instances.
- **RDS**: bump instance size (micro → small → medium…), enable `multiAz: true` for HA,
  add read replicas when reporting load grows. Storage autoscales to `maxAllocatedStorage`.
- Buy capacity gradually — change the CDK values and `cdk deploy`.

## Notes

- First `cdk deploy` (phase 1) MUST run before pushing an image, because App
  Runner needs an image to start — hence the two-phase flow.
- `deletionProtection` + `RemovalPolicy.SNAPSHOT` guard the database from
  accidental deletion.
- The store is currently one JSONB document (`app_store` table). It will be
  normalized into real tables incrementally without downtime.
