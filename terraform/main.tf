terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # tfstate를 S3에 저장 + DynamoDB로 동시 apply 방지
  backend "s3" {
    bucket         = "typers-tfstate"
    key            = "prod/terraform.tfstate"
    region         = "ap-northeast-2"
    dynamodb_table = "typers-tfstate-lock"
    encrypt        = true
  }
}

# 기본 리전: 서울
provider "aws" {
  region = var.aws_region
}

# CloudFront ACM 인증서는 반드시 us-east-1 에 있어야 함
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

data "aws_caller_identity" "current" {}
