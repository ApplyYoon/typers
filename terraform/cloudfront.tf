# ── CloudFront (프론트엔드 CDN) ───────────────────────────────────────

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = [var.domain_name, "www.${var.domain_name}"]

  # 아시아/유럽/북미 포함 (PriceClass_All보다 저렴)
  price_class = "PriceClass_200"

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3-typers-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    target_origin_id       = "S3-typers-frontend"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    # HTML: 캐시 안 함 (배포 즉시 반영)
    # JS/CSS: 빌드 시 파일명에 해시 포함되므로 장기 캐시 가능 → max_ttl로 제어
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 31536000   # 1년
  }

  # React Router SPA 지원 — S3 403/404를 index.html로 처리
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }
  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.cloudfront.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = { Name = "typers-frontend" }
}
