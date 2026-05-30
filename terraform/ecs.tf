# ── ECS Fargate ───────────────────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = "typers-cluster"

  setting {
    name  = "containerInsights"
    value = "disabled"   # 활성화 시 ~$5/월 추가 비용
  }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/typers-api"
  retention_in_days = 7
}

resource "aws_ecs_task_definition" "api" {
  family                   = "typers-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"   # 0.25 vCPU
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "api"
    image = "${aws_ecr_repository.api.repository_url}:${var.app_image_tag}"

    portMappings = [{
      containerPort = 8000
      protocol      = "tcp"
    }]

    # 비민감 환경변수 — 코드 리뷰 가능
    environment = [
      { name = "CORS_ORIGINS", value = "https://${var.domain_name},https://www.${var.domain_name}" },
      { name = "HTTPS",        value = "true" },
    ]

    # 민감 환경변수 — SSM Parameter Store에서 복호화 주입
    secrets = [
      { name = "DATABASE_URL", valueFrom = aws_ssm_parameter.database_url.arn },
      { name = "SECRET_KEY",   valueFrom = aws_ssm_parameter.secret_key.arn },
      { name = "REDIS_URL",    valueFrom = aws_ssm_parameter.redis_url.arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    # 컨테이너 자체 헬스체크 (ALB 헬스체크와 별개)
    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60   # 앱 시작 시간 여유 (Redis/DB 연결 포함)
    }
  }])
}

resource "aws_ecs_service" "api" {
  name            = "typers-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # 배포 전략: 새 태스크 올린 후 기존 내림 (무중단 배포)
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = [aws_subnet.public_a.id, aws_subnet.public_c.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true   # NAT 게이트웨이 없이 ECR 이미지 풀링
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8000
  }

  depends_on = [aws_lb_listener.https]
}
