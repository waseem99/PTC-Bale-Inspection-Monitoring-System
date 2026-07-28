# AWS Staging Deployment

This package deploys the validated PTC Bale application vertical slice without Railway or a managed database.

## Fixed Codistan domain plan

The staging environment uses these hostnames:

| Purpose | Hostname | Initial target |
|---|---|---|
| Primary application | `ptc-aibale.codistan.org` | Vercel |
| AWS API origin | `api.ptc-aibale.codistan.org` | EC2 Elastic IP |
| AWS-hosted frontend/fallback | `aws.ptc-aibale.codistan.org` | EC2 Elastic IP |

The primary hostname must not point to Vercel and EC2 at the same time. During the first phase, Vercel owns `ptc-aibale.codistan.org`; the Vercel server-side `/api` proxy calls `api.ptc-aibale.codistan.org`. The AWS fallback remains available at `aws.ptc-aibale.codistan.org`.

## Resulting topology

```text
https://ptc-aibale.codistan.org
  Vercel React dashboard
       |
       | same-origin /api/*
       v
  Vercel server-side proxy
       |
       | HTTPS
       v
https://api.ptc-aibale.codistan.org
  AWS Elastic IP -> Caddy -> Node.js API -> PostgreSQL 17

https://aws.ptc-aibale.codistan.org
  AWS Elastic IP -> Caddy -> React dashboard
                            `-> /api/* -> Node.js API

GitHub Actions -> AWS OIDC -> private S3 release -> SSM Run Command -> EC2
```

The staging host runs one public EC2 virtual machine. PostgreSQL is private inside Docker. Administration and deployment use AWS Systems Manager, so port 22 and SSH keys are not required.

This environment validates the dashboard, API, authentication, PostgreSQL, reviews, audit records, filters, CSV export, backup and restoration. It does not validate real cameras, RTSP, AI inference or real evidence clips.

## AWS services used

- one EC2 instance with an encrypted `gp3` root volume;
- one Elastic IP for stable AWS DNS records;
- IAM roles and GitHub Actions OIDC;
- Systems Manager Run Command and Parameter Store;
- one private S3 bucket for release bundles and PostgreSQL backups.

PostgreSQL Community runs in Docker on EC2. No RDS, Application Load Balancer, NAT Gateway, ECS, EKS or managed external database is required.

## Cost controls

Do not assume that EC2 and public IPv4 usage will always be free. Before provisioning:

1. confirm the AWS account Free Tier or credit status;
2. create an AWS Budget and billing alert;
3. start with `t3.micro`;
4. move to `t3.small` only if the combined API/PostgreSQL/Docker workload is unstable;
5. delete staging resources when testing is complete, after deciding whether backups and the retained EBS volume are still required.

## Prerequisites

The DevOps engineer needs:

- AWS CLI access with permission to deploy CloudFormation, IAM, EC2, S3 and SSM resources;
- an AWS region, normally the closest approved region;
- an existing VPC and public subnet with an internet gateway route;
- DNS access for `codistan.org`;
- GitHub repository settings access;
- Vercel project and domain settings access.

## 1. Deploy the AWS stack

From the repository root:

```bash
aws cloudformation deploy \
  --region ap-south-1 \
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

If the AWS account already contains the GitHub Actions OIDC provider, also pass:

```bash
ExistingGitHubOidcProviderArn=arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com
```

Only one provider for `token.actions.githubusercontent.com` may exist in an AWS account.

Read the outputs:

```bash
aws cloudformation describe-stacks \
  --region ap-south-1 \
  --stack-name ptc-bale-staging \
  --query 'Stacks[0].Outputs' \
  --output table
```

Record:

- `InstanceId`;
- `ElasticIpAddress`;
- `ArtifactBucketName`;
- `GitHubDeployRoleArn`;
- `RuntimeParameterName`.

Confirm that Systems Manager sees the EC2 instance:

```bash
aws ssm describe-instance-information \
  --region ap-south-1 \
  --filters Key=InstanceIds,Values=INSTANCE_ID \
  --query 'InstanceInformationList[0].PingStatus' \
  --output text
```

The result must be `Online` before deployment.

## 2. Configure DNS

### AWS records

Create these DNS A records and point both to the CloudFormation `ElasticIpAddress`:

```text
api.ptc-aibale.codistan.org  -> ELASTIC_IP
aws.ptc-aibale.codistan.org  -> ELASTIC_IP
```

Wait for both names to resolve publicly. Caddy requires inbound TCP 80 and 443 to issue HTTPS certificates. UDP 443 is optional for HTTP/3.

### Vercel primary domain

In the Vercel project, add this custom domain:

```text
ptc-aibale.codistan.org
```

Create the DNS record exactly as Vercel displays in its domain-verification screen. Do not point this hostname to the EC2 Elastic IP while Vercel is the active frontend host.

The final public application URL will be:

```text
https://ptc-aibale.codistan.org
```

## 3. Create the secure runtime configuration

Copy the template outside the repository working tree or into an ignored local file:

```bash
cp infrastructure/aws/runtime.env.example /tmp/ptc-bale-runtime.env
chmod 600 /tmp/ptc-bale-runtime.env
```

The domain values are already prepared as:

```env
API_DOMAIN=api.ptc-aibale.codistan.org
APP_DOMAIN=aws.ptc-aibale.codistan.org
ALLOWED_ORIGINS=https://ptc-aibale.codistan.org,https://aws.ptc-aibale.codistan.org
```

Replace all password and email placeholders. Important rules:

- use long and unique passwords;
- keep the PostgreSQL password alphanumeric unless it is correctly URL-encoded in `DATABASE_URL`;
- use a valid TLS notification email;
- keep the two exact approved origins in `ALLOWED_ORIGINS`;
- do not wildcard Vercel preview domains;
- do not commit the runtime file.

Upload it to Parameter Store as a base64-encoded SecureString:

```bash
infrastructure/aws/scripts/upload-runtime-env.sh \
  /tmp/ptc-bale-runtime.env \
  ap-south-1 \
  /ptc-bale/staging/runtime-env-b64
```

The EC2 instance role can read only this parameter. GitHub Actions never receives the PostgreSQL or application passwords.

## 4. Configure the GitHub Environment

Create a GitHub Environment named exactly:

```text
aws-staging
```

Restrict it to `main` and add a required deployment reviewer where appropriate.

Add these GitHub **Environment variables**, not AWS access-key secrets:

| Variable | Value |
|---|---|
| `AWS_REGION` | selected region, for example `ap-south-1` |
| `AWS_DEPLOY_ROLE_ARN` | CloudFormation `GitHubDeployRoleArn` |
| `AWS_ARTIFACT_BUCKET` | CloudFormation `ArtifactBucketName` |
| `AWS_EC2_INSTANCE_ID` | CloudFormation `InstanceId` |
| `AWS_RUNTIME_PARAMETER_NAME` | CloudFormation `RuntimeParameterName` |
| `AWS_API_DOMAIN` | `api.ptc-aibale.codistan.org` |

No long-lived AWS access key is required. GitHub requests temporary credentials through OIDC, restricted to this repository and the `aws-staging` Environment.

## 5. Run the first AWS deployment

The workflow is:

```text
.github/workflows/aws-staging-deploy.yml
```

It runs automatically after relevant changes reach `main`, or manually using **Deploy AWS Staging**.

The workflow:

1. starts PostgreSQL 17 in GitHub Actions;
2. installs dependencies using the committed frozen lockfile;
3. applies the Prisma migration to the test database;
4. runs backend and frontend checks;
5. builds the API runtime, Prisma tools and AWS dashboard images;
6. creates an immutable release bundle and checksum;
7. authenticates to AWS through OIDC;
8. uploads the release to private S3;
9. deploys to EC2 through SSM Run Command;
10. verifies `https://api.ptc-aibale.codistan.org/readyz`.

On the first deployment, migrations run and the synthetic users plus 257 synthetic events are seeded when `SEED_ON_FIRST_DEPLOY=true`. A host marker prevents automatic reseeding on later releases.

## 6. Deploy the frontend on Vercel

Import the repository into Vercel using:

```text
Root Directory: apps/dashboard-web
Framework: Vite
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm build
Output Directory: dist
```

Set these Vercel environment variables for Production:

```env
VITE_DATA_MODE=live
VITE_API_BASE_URL=/api
VITE_REQUEST_TIMEOUT_MS=12000
VITE_ALLOW_DEMO_CREDENTIALS=false
VITE_ENVIRONMENT_NAME=PTC AI Bale Staging
AWS_API_ORIGIN=https://api.ptc-aibale.codistan.org
```

`AWS_API_ORIGIN` is a server-side Vercel Function variable. It must not use the `VITE_` prefix.

The function at `apps/dashboard-web/api/[...path].mjs` forwards browser `/api/*` requests to AWS while preserving first-party secure-cookie authentication on `ptc-aibale.codistan.org`.

Attach the custom domain:

```text
ptc-aibale.codistan.org
```

After deployment, open:

```text
https://ptc-aibale.codistan.org
```

## 7. AWS-hosted frontend fallback

The same release always deploys a dashboard container to EC2. It is available at:

```text
https://aws.ptc-aibale.codistan.org
```

Caddy sends `/api/*` to the API and all other paths to the dashboard container. This gives DevOps a direct AWS fallback and validates the eventual all-AWS arrangement.

## 8. Future frontend cutover from Vercel to AWS

When the frontend must move fully to AWS:

1. verify `https://aws.ptc-aibale.codistan.org` completely;
2. schedule a DNS maintenance window;
3. change `APP_DOMAIN` in the secure runtime file to `ptc-aibale.codistan.org`;
4. keep `ALLOWED_ORIGINS=https://ptc-aibale.codistan.org` and any temporarily required fallback origin;
5. upload the new runtime parameter;
6. point `ptc-aibale.codistan.org` from Vercel to the EC2 Elastic IP;
7. rerun **Deploy AWS Staging** so Caddy requests the certificate for the primary hostname;
8. validate login, deep links, review persistence and exports;
9. remove the Vercel custom domain only after the AWS URL is healthy.

Do not point the same hostname to both platforms during the cutover.

## 9. Test accounts

Use these usernames:

```text
viewer
supervisor
admin
```

Passwords are the secure values supplied in the runtime environment.

## 10. Manual acceptance checklist

### Availability

- `https://api.ptc-aibale.codistan.org/healthz` returns HTTP 200;
- `https://api.ptc-aibale.codistan.org/readyz` reports PostgreSQL connected;
- `https://ptc-aibale.codistan.org` opens through Vercel;
- deep links refresh without a 404;
- `https://aws.ptc-aibale.codistan.org` opens through EC2.

### Authentication and authorization

- viewer, supervisor and administrator can sign in;
- refresh preserves the session;
- logout clears the session;
- the session cookie is Secure, HttpOnly and SameSite Strict;
- viewer review attempts return HTTP 403;
- supervisor and administrator reviews persist.

### Application behavior

- 257 synthetic events are available;
- camera, date, outcome and review filters work;
- search, sorting and pagination work;
- event details open directly;
- CSV export respects filters;
- a stale concurrent review returns HTTP 409.

### Persistence and recovery

- review an event;
- restart the API container and confirm the review remains;
- restart PostgreSQL and confirm the review remains;
- execute a backup and verify its S3 object and checksum;
- review the controlled restoration procedure before UAT closure.

## Operations

### Administrative shell without SSH

```bash
aws ssm start-session \
  --region ap-south-1 \
  --target INSTANCE_ID
```

### Inspect services

```bash
cd /opt/ptc-bale/current
sudo docker compose -f docker-compose.staging.yml ps
sudo docker compose -f docker-compose.staging.yml logs --tail=200 api
sudo docker compose -f docker-compose.staging.yml logs --tail=200 postgres
sudo docker compose -f docker-compose.staging.yml logs --tail=200 caddy
sudo docker compose -f docker-compose.staging.yml logs --tail=200 dashboard
```

### Restart services

```bash
cd /opt/ptc-bale/current
sudo docker compose -f docker-compose.staging.yml restart api
sudo docker compose -f docker-compose.staging.yml restart postgres
```

### Run an immediate backup

```bash
sudo /opt/ptc-bale/current/scripts/backup-postgres.sh manual
```

A systemd timer also creates a daily backup around 02:15 UTC. Local copies follow `BACKUP_RETENTION_DAYS`; the S3 lifecycle expires backup objects after 30 days.

### Restore a backup

```bash
sudo CONFIRM_PTC_RESTORE=YES \
  /opt/ptc-bale/current/scripts/restore-postgres.sh \
  s3://ARTIFACT_BUCKET/backups/ptc-bale-manual-TIMESTAMP.dump
```

The restore script creates a pre-restore backup, stops the API, restores PostgreSQL and waits for API health.

### Controlled reseeding

Normal deployments never reset PostgreSQL. To rerun the non-destructive synthetic seed after rotating staging passwords:

```bash
sudo rm /opt/ptc-bale/shared/seeded
```

Then rerun the deployment workflow. Do not use `seed:reset` against this production-mode staging environment.

## Rollback behavior

The EC2 host retains the three newest release directories. If startup fails, the deployment script attempts to restore the previous application release.

Prisma migrations are not automatically reversed. A PostgreSQL backup is created before later migrations, so database restoration remains an explicit DevOps decision.

## Security boundaries

- do not commit the runtime environment;
- do not place passwords in GitHub issues, PR comments or Vercel `VITE_` variables;
- do not store PTC footage, camera URLs, production IPs, database dumps or real evidence in GitHub;
- do not expose PostgreSQL port 5432;
- do not open SSH port 22 without approved need;
- restrict the GitHub Environment and OIDC trust;
- keep this staging environment synthetic-only until cloud handling is approved.

## Teardown

Before deleting the stack, decide whether the retained S3 bucket, PostgreSQL backups and EBS root volume must be preserved.

```bash
aws cloudformation delete-stack \
  --region ap-south-1 \
  --stack-name ptc-bale-staging
```

The template retains the S3 bucket and configures the EC2 root volume not to delete automatically. DevOps must explicitly remove retained resources after confirming they are no longer required.
