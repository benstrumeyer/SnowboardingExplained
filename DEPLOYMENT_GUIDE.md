# Deployment Guide

## Local Development with Docker

```bash
# Start MongoDB and MCP server locally
docker-compose up

# Seed database
docker-compose exec mcp-server npm run seed
```

## AWS Deployment Steps

### 1. Prerequisites
- AWS account with billing enabled
- GitHub account with this repo
- Terraform installed locally

### 2. Set up AWS Credentials
```bash
# Create IAM user in AWS console
# Generate access keys
# Store in GitHub Secrets:
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
```

### 3. Create MongoDB Atlas Cluster
- Go to mongodb.com/cloud
- Create free cluster
- Get connection string
- Store in GitHub Secrets as MONGODB_URI

### 4. Deploy Infrastructure with Terraform
```bash
cd terraform

# Copy example file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars

# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Apply (creates AWS resources)
terraform apply
```

### 5. GitHub Actions CI/CD
- Push to master branch
- GitHub Actions automatically:
  1. Builds Docker image
  2. Pushes to AWS ECR
  3. Updates ECS service
  4. Deploys new version

### 6. Monitor Deployment
```bash
# View logs
aws logs tail /ecs/mcp-server --follow

# Check service status
aws ecs describe-services \
  --cluster snowboarding-coach \
  --services mcp-server
```

## Environment Variables

### Local (.env)
```
NODE_ENV=development
MONGODB_URI=mongodb://root:password@localhost:27017/snowboarding-coach?authSource=admin
MONGODB_DB=snowboarding-coach
PORT=3000
```

### Production (GitHub Secrets)
- MONGODB_URI (from MongoDB Atlas)
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY

## Cost Estimation
- ECS Fargate: ~$10-30/month
- MongoDB Atlas: ~$0-50/month (free tier available)
- Load Balancer: ~$16/month
- Total: ~$26-96/month

## Cleanup
```bash
# Destroy all AWS resources
terraform destroy
```
