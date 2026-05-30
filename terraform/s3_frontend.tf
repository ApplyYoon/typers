# ── S3 (프론트엔드 정적 호스팅) ───────────────────────────────────────

resource "aws_s3_bucket" "frontend" {
  # 계정 ID를 붙여 전 세계 유일한 버킷 이름 보장
  bucket = "typers-frontend-${data.aws_caller_identity.current.account_id}"
  tags = { Name = "typers-frontend" }
}

# 퍼블릭 액세스 완전 차단 — CloudFront OAC를 통해서만 접근
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Origin Access Control (OAC) — OAI 대체 최신 방식
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "typers-frontend-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# S3 버킷 정책 — 이 CloudFront 배포에서만 GetObject 허용
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFrontOAC"
      Effect = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
        }
      }
    }]
  })
}
