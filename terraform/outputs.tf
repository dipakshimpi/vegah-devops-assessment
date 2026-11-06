output "public_ip" {
  description = "Elastic IP address attached to the EC2 instance"
  value       = aws_eip.app_eip.public_ip
}

output "hostname" {
  description = "Auto-HTTPS hostname for Caddy using nip.io"
  value       = "${replace(aws_eip.app_eip.public_ip, ".", "-")}.nip.io"
}

output "ssh_command" {
  description = "Command to SSH directly into the instance"
  value       = "ssh -i terraform/vegah-key.pem ubuntu@${aws_eip.app_eip.public_ip}"
}

output "app_url" {
  description = "Public HTTPS application URL"
  value       = "https://${replace(aws_eip.app_eip.public_ip, ".", "-")}.nip.io"
}

