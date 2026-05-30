# ── IAM ──────────────────────────────────────────────────────────────

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# ECS Task Execution Role — ECR 이미지 풀 + CloudWatch 로그 쓰기 + SSM 읽기
resource "aws_iam_role" "ecs_execution" {
  name               = "typers-ecs-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "ecs_execution_base" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# SSM Parameter Store 읽기 (시크릿 컨테이너 주입용)
resource "aws_iam_role_policy" "ecs_ssm" {
  name = "typers-ecs-ssm"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameters", "ssm:GetParameter"]
      Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/typers/*"
    }]
  })
}

# ECS Task Role — 컨테이너가 실행 중 AWS 서비스 접근 시 사용 (현재 불필요, AI 기능 추가 시 확장)
resource "aws_iam_role" "ecs_task" {
  name               = "typers-ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}
