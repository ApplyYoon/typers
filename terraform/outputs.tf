output "route53_nameservers" {
  value       = aws_route53_zone.main.name_servers
  description = "★ 가비아에 등록할 네임서버 4개 (apply 후 바로 확인)"
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.api.repository_url
  description = "Docker 이미지 푸시 주소 (GitHub Actions에서 사용)"
}

output "cloudfront_domain" {
  value       = aws_cloudfront_distribution.frontend.domain_name
  description = "CloudFront 배포 도메인 (DNS 전파 전 직접 접속 테스트용)"
}

output "alb_dns_name" {
  value       = aws_lb.main.dns_name
  description = "ALB DNS (api.typers.kr 연결 전 직접 테스트용)"
}

output "rds_endpoint" {
  value       = aws_db_instance.postgres.address
  description = "RDS 엔드포인트 (SSM에 자동 저장됨, 참고용)"
}

output "s3_frontend_bucket" {
  value       = aws_s3_bucket.frontend.bucket
  description = "프론트엔드 빌드 파일 업로드 버킷 이름 (GitHub Actions에서 사용)"
}
