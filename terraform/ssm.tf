# ── SSM Parameter Store (시크릿) ──────────────────────────────────────
# SecureString: KMS로 암호화, ECS 컨테이너 시작 시 자동 복호화 주입
# 값은 terraform.tfvars 또는 TF_VAR_* 환경변수로 주입 (코드에 절대 하드코딩 금지)

resource "aws_ssm_parameter" "database_url" {
  name  = "/typers/prod/DATABASE_URL"
  type  = "SecureString"
  # RDS 엔드포인트는 apply 후에 확정되므로 interpolation 사용
  value = "postgresql+asyncpg://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.address}:5432/typers"
}

resource "aws_ssm_parameter" "secret_key" {
  name  = "/typers/prod/SECRET_KEY"
  type  = "SecureString"
  value = var.secret_key
}

resource "aws_ssm_parameter" "redis_url" {
  name  = "/typers/prod/REDIS_URL"
  type  = "SecureString"
  value = var.redis_url
}
