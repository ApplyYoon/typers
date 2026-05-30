# ── ECR ──────────────────────────────────────────────────────────────

resource "aws_ecr_repository" "api" {
  name                 = "typers-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true   # 취약점 자동 스캔
  }

  tags = { Name = "typers-api" }
}

# 이미지 10개 초과 시 오래된 것 자동 삭제 (스토리지 비용 절감)
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
