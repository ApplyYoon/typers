variable "aws_region" {
  description = "AWS 리전"
  default     = "ap-northeast-2"
}

variable "domain_name" {
  description = "서비스 도메인 (apex)"
  default     = "typers.kr"
}

variable "db_username" {
  description = "PostgreSQL 유저명"
  default     = "typers"
}

variable "db_password" {
  description = "PostgreSQL 비밀번호 (terraform.tfvars 또는 TF_VAR_db_password)"
  sensitive   = true
}

variable "secret_key" {
  description = "JWT 서명 시크릿 (최소 32자 랜덤 문자열)"
  sensitive   = true
}

variable "redis_url" {
  description = "Upstash Redis URL (rediss://default:...@...upstash.io:6379)"
  sensitive   = true
}

variable "app_image_tag" {
  description = "ECR 이미지 태그 — CI/CD에서 커밋 SHA로 주입"
  default     = "latest"
}
