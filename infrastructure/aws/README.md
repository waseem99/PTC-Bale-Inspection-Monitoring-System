# PTC Bale AWS Staging Runbook

This directory contains the controlled staging package for the PTC Bale Inspection & Monitoring System.

## Deployment boundary

The package deploys:

- the approved React dashboard;
- the Node.js/Express platform API;
- PostgreSQL 17;
- protected evidence storage on a private Docker volume;
- Caddy TLS termination and reverse proxy;
- automated database migration, health verification, backup and application rollback.

It does **not** deploy or contain:

- factory camera credentials or RTSP URLs;
- raw factory footage or identifiable frames;
- restricted annotations or datasets;
- actual AI model binaries;
- client database dumps;
- production secrets.

Actual camera and model integration remain controlled by issues #84 and #85.

## Target domains

| Purpose | Domain |
|---|---|
| Primary Vercel application | `ptc-aibale.codistan.org` |
| AWS API origin | `api.ptc-aibale.codistan.org` |
| AWS-hosted fallback application | `aws.ptc-aibale.codistan.org` |

The primary Vercel application calls the AWS API through the same-origin `/api` proxy. Do not point the primary hostname to both Vercel and EC2 simultaneously.

## Required accounts and access

- AWS account with permission to deploy the CloudFormation stack;
- DNS control for `codistan.org`;
- Vercel project access for the approved frontend;
- GitHub repository/environment administration;
- an approved notification email for TLS expiry/failure messages.

No SSH ingress is required. Administration and deployment use AWS Systems Manager.

## 1. Deploy the infrastructure stack

Validate the template:

```bash
aws cloudformation validate-template \
  --template-body file://infrastructure/aws/cloudformation/staging-stack.yml
```

Deploy it using the correct VPC and public subnet:

```bash
aws cloudformation deploy \
  --stack-name ptc-bale-staging \
  --template-file infrastructure/aws/cloudformation/staging-stack.yml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    VpcId=vpc-REPLACE \
    PublicSubnetId=subnet-REPLACE \
    GitHubOwner=waseem99 \
    GitHubRepository=PTC-Bale-Inspection-Monitoring-System \
    GitHubEnvironment=aws-staging
```

Use `ExistingGitHubOidcProviderArn` when the account already has the GitHub Actions OIDC provider. An AWS account may have only one provider for the same issuer URL.

Record these stack outputs:

- `InstanceId`;
- `ElasticIpAddress`;
- `ArtifactBucketName`;
- `GitHubDeployRoleArn`;
- `RuntimeParameterName`.

## 2. Configure DNS

Create these records after the Elastic IP is allocated:

- `api.ptc-aibale.codistan.org` — A record to the Elastic IP;
- `aws.ptc-aibale.codistan.org` — A record to the Elastic IP.

Add `ptc-aibale.codistan.org` to the Vercel project and create only the DNS record Vercel instructs. Confirm all three hostnames resolve before deployment.

## 3. Prepare the private runtime environment

Copy the template locally, outside Git history:

```bash
cp infrastructure/aws/runtime.env.example /secure/path/ptc-runtime.env
chmod 600 /secure/path/ptc-runtime.env
```

Replace every placeholder. Requirements:

- unique database and user passwords;
- a separately generated machine-ingestion token;
- `COOKIE_SECURE=true`;
- `SIMULATOR_ENABLED=false`;
- exact HTTPS allowed origins;
- no demo credentials exposed to the browser;
- no camera credentials or factory media references.

Upload the environment as an encrypted Parameter Store value:

```bash
infrastructure/aws/scripts/upload-runtime-env.sh \
  /secure/path/ptc-runtime.env \
  AWS_REGION \
  /ptc-bale/staging/runtime-env-b64
```

Do not paste the runtime environment into GitHub issues, Actions variables or logs.

## 4. Configure the protected GitHub environment

Create an environment named `aws-staging` and require an approved reviewer.

Set these environment **variables**:

| Variable | Value source |
|---|---|
| `AWS_REGION` | Deployment region |
| `AWS_DEPLOY_ROLE_ARN` | CloudFormation output |
| `AWS_ARTIFACT_BUCKET` | CloudFormation output |
| `AWS_EC2_INSTANCE_ID` | CloudFormation output |
| `AWS_RUNTIME_PARAMETER_NAME` | CloudFormation output |
| `AWS_API_DOMAIN` | `api.ptc-aibale.codistan.org` |

The workflow uses OIDC and does not require long-lived AWS access keys.

## 5. Configure Vercel

The dashboard contains a same-origin proxy at `apps/dashboard-web/api/[...path].mjs`.

Set only this server-side Vercel environment variable:

```text
AWS_API_ORIGIN=https://api.ptc-aibale.codistan.org
```

Build the approved frontend in live mode:

```text
VITE_DATA_MODE=live
VITE_API_BASE_URL=/api
VITE_ALLOW_DEMO_CREDENTIALS=false
```

Never expose the ingestion token, database URL or application passwords as `VITE_*` variables.

## 6. Validate and deploy

Every pull request changing the API, dashboard or AWS package runs the validation/package job in `.github/workflows/aws-staging-release.yml`.

A push to `main` or an approved manual workflow run:

1. creates random temporary CI credentials;
2. applies PostgreSQL migrations to a fresh database;
3. runs frontend/backend checks;
4. validates scripts and Compose configuration;
5. builds immutable Linux images;
6. creates a checksummed release bundle;
7. authenticates to AWS through OIDC;
8. uploads the release to private S3;
9. deploys through Systems Manager;
10. verifies the public API readiness endpoint.

The deployment must not be approved while required CI, review or environment gates are failing.

## 7. Post-deployment smoke test

Verify:

```bash
curl --fail https://api.ptc-aibale.codistan.org/healthz
curl --fail https://api.ptc-aibale.codistan.org/readyz
curl --fail https://aws.ptc-aibale.codistan.org/healthz
```

Then perform role-based browser checks:

- viewer can log in and cannot review events;
- supervisor can review with remarks;
- stale review versions return conflict behavior;
- admin can access operational retention dry-run;
- events, cameras, health, evidence metadata and reports use live APIs;
- no live environment falls back to mock data;
- generated PDF and CSV totals reconcile with PostgreSQL;
- logout invalidates the session;
- unauthorized evidence access is rejected.

Machine-ingestion checks must use a temporary controlled test event and remove it afterward. Simulator endpoints must return disabled/not found in production.

## 8. Backup and recovery

A successful deployment installs a daily backup timer. Backups are:

- PostgreSQL custom-format dumps;
- checksummed locally;
- uploaded to the private S3 `backups/` prefix;
- lifecycle-expired by S3 policy.

Create an immediate backup:

```bash
sudo /opt/ptc-bale/current/scripts/backup-postgres.sh manual
```

Restore is deliberately destructive and requires explicit confirmation:

```bash
sudo CONFIRM_PTC_RESTORE=YES \
  /opt/ptc-bale/current/scripts/restore-postgres.sh \
  s3://BUCKET/backups/BACKUP.dump
```

The restore process creates a pre-restore backup, stops the API, restores PostgreSQL, restarts the API and waits for health recovery.

## 9. Application rollback

The deployment script automatically returns application containers to the previous release if the new release fails health checks. Database migrations are forward-only; any migration failure or incompatible release requires the documented forward-recovery procedure and a verified database backup.

Never delete an old release until:

- the current release is healthy;
- browser smoke testing passes;
- backup verification succeeds;
- release identity is recorded.

## 10. Production acceptance gates

The staging package is not considered client-production-ready until all of the following are recorded:

- repository is private;
- `main` branch protection and required reviews/checks are enabled;
- GitHub `aws-staging` environment has reviewer approval;
- DNS/TLS and Vercel/AWS deployment are verified live;
- backup and restore are exercised on the deployed environment;
- PM UAT passes with no known P0/P1 defect;
- approved retention and support ownership are recorded;
- actual hardware/model integrations complete under #84/#85.
