# ── RDS PostgreSQL ────────────────────────────────────────────────────

resource "aws_db_subnet_group" "main" {
  name       = "typers-db-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_c.id]
  tags = { Name = "typers-db-subnet-group" }
}

resource "aws_db_instance" "postgres" {
  identifier     = "typers-postgres"
  engine         = "postgres"
  engine_version = "16"
  instance_class = "db.t3.micro"

  allocated_storage = 20
  storage_type      = "gp2"
  storage_encrypted = true

  db_name  = "typers"
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # 포트폴리오 설정 — 실제 서비스라면 deletion_protection = true 권장
  skip_final_snapshot     = true
  deletion_protection     = false
  backup_retention_period = 7
  multi_az                = false

  tags = { Name = "typers-postgres" }
}
