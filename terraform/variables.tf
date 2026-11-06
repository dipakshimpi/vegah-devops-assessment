variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-southeast-2" # Allowed region permitted by AWS Organization SCP
}

variable "instance_type" {
  description = "EC2 instance size"
  type        = string
  default     = "t3.small" # 2 vCPU, 2 GB RAM (as specified in 02-architecture.md)
}

variable "project_name" {
  description = "Project name tag"
  type        = string
  default     = "vegah-devops"
}

