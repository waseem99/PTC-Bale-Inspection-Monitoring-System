# AWS Staging Deployment

This package deploys the validated PTC Bale application vertical slice without Railway or a managed database.

## Resulting topology

```text
Vercel dashboard
  /api/* -> Vercel proxy function -> HTTPS
                                      |
                                      v
AWS Elastic IP -> Caddy on EC2 -> Node.js API
                              |-> optional AWS-hosted dashboard
                              `-> PostgreSQL 17 on the same EC2 host

GitHub Actions -> AWS OIDC role -> private S3 release bundle -> SSM Run Command -> EC2
```

The staging host runs only one public virtual machine. PostgreSQL is not publicly exposed. Administration and deployment use AWS Systems Manager, so port 22 and SSH keys are not required.

This deployment validates the dashboard, API, authentication, PostgreSQL, review, audit, filters, CSV export, backup and restoration workflows. It does not validate real cameras, RTSP, AI inference, or evidence clips.

## AWS services used

- EC2 with one encrypted gp3 root volume;
- one Elastic IP for stable DNS;
- IAM roles and a GitHub OIDC provider;
- Systems Manager Run Command and Parameter Store;
- one private S3 bucket for short-lived release bundles and PostgreSQL backups.

The application database is PostgreSQL Community running in Docker on EC2. No RDS, load balancer, NAT Gateway, ECS, EKS or paid external database is required.

## Cost warning

Do not assume the deployment is permanently free. AWS Free Tier treatment depends on the account creation date and remaining credits or legacy monthly allowances. AWS charges for public IPv4 addresses, including an Elastic IP attached to a running instance. The CloudFormation template intentionally uses only one public IPv4 address and no load balancer or NAT Gateway.

Before provisioning:

1. confirm the account's Free Tier or credit status;
2. create a small AWS Budget and billing alert;
3. choose `t3.micro` first;
4. use `t3.small` only if the combined API/PostgreSQL/Docker workload is unstable;
5. terminate the stack when staging is no longer required, while deliberately retaining or deleting the S3 bucket and EBS volume.

## Prerequisites

The DevOps engineer needs:

- an AWS account and a region;
- AWS CLI authenticated with permission to deploy CloudFormation, IAM, EC2, S3 and SSM resources;
- a VPC and public subnet with an internet gateway route;
- two DNS names, for example:
  - `api-staging.example.com`;
  - `ptc-staging.example.com`;
- access to the GitHub repository settings;
- access to the Vercel project settings.

The API and application DNS names must be different. Caddy automatically provisions HTTPS certificates after both A records point to the stack's Elastic IP.

## 1. Create the AWS stack

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

If the AWS account already has an IAM OIDC provider for `token.actions.githubusercontent.com`, pass its ARN:

```bash
ExistingGitHubOidcProviderArn=arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com
```

Only one provider with that URL may exist in an AWS account.

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

Confirm that Systems Manager sees the instance before deploying:

```bash
aws ssm describe-instance-information \
  --region ap-south-1 \
  --filters Key=InstanceIds,Values=INSTANCE_ID \
  --query 'InstanceInformationList[0].PingStatus' \
  --output text
```

The result should be `Online`.

## 2. Configure DNS

Create two DNS A records pointing to `ElasticIpAddress`:

```text
api-staging.example.com  -> ELASTIC_IP
ptc-staging.example.com  -> ELASTIC_IP
```

Wait until public DNS resolves before the first application deployment. Caddy needs inbound TCP 80 and 443 to obtain certificates. UDP 443 is enabled for HTTP/3 but is not required for basic operation.

## 3. Create the secure runtime environment

Copy the template outside the repository working tree or into a file ignored by Git:

```bash
cp infrastructure/aws/runtime.env.example /tmp/ptc-bale-runtime.env
chmod 600 /tmp/ptc-bale-runtime.env
```

Update every placeholder. Important rules:

- use long, unique passwords;
- keep the PostgreSQL password alphanumeric unless it is correctly URL-encoded in `DATABASE_URL`;
- set `API_DOMAIN` and `APP_DOMAIN` to the DNS records created above;
- add the stable Vercel production origin and the AWS application origin to `ALLOWED_ORIGINS`;
- do not add a wildcard Vercel origin;
- do not commit this file.

Upload it to Parameter Store as a base64-encoded SecureString:

```bash
infrastructure/aws/scripts/upload-runtime-env.sh \
  /tmp/ptc-bale-runtime.env \
  ap-south-1 \
  /ptc-bale/staging/runtime-env-b64
```

The EC2 instance role can read only this parameter. GitHub Actions does not receive the database or application passwords.

## 4. Configure the GitHub Environment

Create a GitHub Environment named exactly:

```text
aws-staging
```

Restrict it to the `main` branch and add a required reviewer if desired.

Add the following **Environment variables**, not secrets:

| Variable | Value |
|---|---|
| `AWS_REGION` | e.g. `ap-south-1` |
| `AWS_DEPLOY_ROLE_ARN` | CloudFormation `GitHubDeployRoleArn` output |
| `AWS_ARTIFACT_BUCKET` | CloudFormation `ArtifactBucketName` output |
| `AWS_EC2_INSTANCE_ID` | CloudFormation `InstanceId` output |
| `AWS_RUNTIME_PARAMETER_NAME` | CloudFormation `RuntimeParameterName` output |
| `AWS_API_DOMAIN` | e.g. `api-staging.example.com` |

No long-lived AWS access key is required. The workflow requests temporary AWS credentials through GitHub OIDC and the trust relationship is restricted to this repository and the `aws-staging` environment.

## 5. Run the first deployment

The workflow file is:

```text
.github/workflows/aws-staging-deploy.yml
```

It runs automatically after changes reach `main`, or manually from GitHub Actions using **Deploy AWS Staging**.

The workflow:

1. starts PostgreSQL 17 in the GitHub runner;
2. installs the frozen pnpm lockfile;
3. deploys the test migration;
4. runs backend and frontend checks;
5. builds three Linux/AMD64 images:
   - API runtime;
   - Prisma/seed tools;
   - optional AWS dashboard;
6. creates an immutable release bundle and checksum;
7. authenticates to AWS using OIDC;
8. uploads the bundle to the private S3 bucket;
9. invokes the EC2 instance through SSM Run Command;
10. verifies the public `/readyz` endpoint.

On the first deployment, the host applies migrations and seeds the three synthetic users and 257 synthetic events when `SEED_ON_FIRST_DEPLOY=true`. A marker prevents automatic reseeding on later releases.

## 6. Deploy the frontend on Vercel

Import the repository as a Vercel project with:

```text
Root Directory: apps/dashboard-web
Framework: Vite
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm build
Output Directory: dist
```

Add these Vercel environment variables:

```text
VITE_DATA_MODE=live
VITE_API_BASE_URL=/api
VITE_REQUEST_TIMEOUT_MS=12000
VITE_ALLOW_DEMO_CREDENTIALS=false
VITE_ENVIRONMENT_NAME=PTC AWS Staging
AWS_API_ORIGIN=https://api-staging.example.com
```

`AWS_API_ORIGIN` is a server-side Vercel Function variable and must not use the `VITE_` prefix. The function at `apps/dashboard-web/api/[...path].mjs` proxies browser `/api/*` calls to AWS while preserving first-party secure-cookie authentication.

After Vercel assigns the stable production project URL, update `ALLOWED_ORIGINS` in the runtime environment and upload the Parameter Store value again. Then rerun **Deploy AWS Staging**.

## 7. Optional frontend on the same EC2 host

The deployment always includes an AWS-hosted dashboard container. Visit:

```text
https://ptc-staging.example.com
```

Caddy sends `/api/*` to the API and all other paths to the dashboard container. This provides a fallback if the Vercel deployment is removed and demonstrates the future all-AWS arrangement without introducing S3/CloudFront frontend hosting yet.

## 8. Test accounts

Use the usernames:

```text
viewer
supervisor
admin
```

Passwords are the secure values supplied in the runtime environment.

## 9. Manual acceptance checklist

### Availability

- `https://api-staging.example.com/healthz` returns HTTP 200;
- `https://api-staging.example.com/readyz` reports PostgreSQL connected;
- the Vercel URL opens and deep links refresh correctly;
- the AWS application URL opens.

### Authentication and authorization

- all three roles can sign in;
- refresh preserves the session;
- logout clears the session;
- the session cookie is Secure, HttpOnly and SameSite Strict;
- viewer review requests return HTTP 403;
- supervisor and administrator reviews persist.

### Application behavior

- 257 synthetic events are available;
- camera, date, outcome and review filters work;
- search, sorting and pagination work;
- event detail routes open directly;
- CSV export respects filters;
- stale concurrent review returns HTTP 409.

### Persistence

- review an event;
- restart the API container;
- confirm the review remains;
- restart the PostgreSQL container;
- confirm the review remains;
- execute a backup and verify the S3 object and checksum.

## Operations

### Open an administrative shell without SSH

Use Session Manager:

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

A systemd timer also creates a daily backup around 02:15 UTC. Local copies are retained according to `BACKUP_RETENTION_DAYS`; S3 lifecycle expires backup objects after 30 days.

### Restore a backup

```bash
sudo CONFIRM_PTC_RESTORE=YES \
  /opt/ptc-bale/current/scripts/restore-postgres.sh \
  s3://ARTIFACT_BUCKET/backups/ptc-bale-manual-TIMESTAMP.dump
```

The restore script creates a pre-restore backup, stops the API, restores PostgreSQL and waits for API health.

### Force controlled reseeding

Normal deployments never reset the database. To re-run the non-destructive synthetic seed after changing staging passwords:

```bash
sudo rm /opt/ptc-bale/shared/seeded
```

Then rerun the deployment workflow. Do not use `seed:reset` against this production-mode staging deployment.

## Rollback behavior

The host retains the three newest release directories. If application startup fails, the deployment script attempts to point the `current` link back to the previous release and restart it.

Prisma migrations are not automatically reversed. A pre-deployment PostgreSQL backup is created before later migrations, so a database restoration remains an explicit DevOps decision.

## Security boundaries

- do not commit the runtime environment;
- do not store PTC footage, camera URLs, production IP addresses, database dumps or evidence in GitHub;
- do not expose PostgreSQL port 5432 in the security group or Docker Compose;
- do not add SSH port 22 unless there is an approved operational reason;
- keep the GitHub Environment and OIDC trust restricted;
- make the repository private before adding client-sensitive material;
- use this cloud environment only with synthetic data until PTC approves cloud handling.

## Teardown

Before deleting the stack, decide whether the retained S3 bucket, PostgreSQL backups and EBS root volume must be preserved.

```bash
aws cloudformation delete-stack \
  --region ap-south-1 \
  --stack-name ptc-bale-staging
```

The template retains the S3 bucket and sets the EC2 root volume not to delete on termination. DevOps must explicitly remove retained resources after confirming backups are no longer required.
