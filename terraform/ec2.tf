# ── 1. Find latest official Ubuntu 24.04 LTS AMI ─────────────────────────────
data "aws_ami" "ubuntu_24" {
  most_recent = true
  owners      = ["099720109477"] # Canonical official owner ID

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── 2. Generate SSH Key Pair Automatically ───────────────────────────────────
resource "tls_private_key" "ssh" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "generated_key" {
  key_name   = "${var.project_name}-key"
  public_key = tls_private_key.ssh.public_key_openssh

  tags = {
    Name = "${var.project_name}-key"
  }
}

# Save the private key locally for SSH access (file is in .gitignore)
resource "local_file" "private_key" {
  content         = tls_private_key.ssh.private_key_pem
  filename        = "${path.module}/vegah-key.pem"
  file_permission = "0600"
}

# ── 3. Security Group (Firewall Rules) ───────────────────────────────────────
resource "aws_security_group" "web_sg" {
  name        = "${var.project_name}-sg"
  description = "Allow SSH, HTTP, and HTTPS traffic"

  # SSH access (port 22)
  ingress {
    description = "SSH from anywhere"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP access (port 80)
  ingress {
    description = "HTTP traffic (Caddy)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS access (port 443)
  ingress {
    description = "HTTPS traffic (Caddy Lets Encrypt)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound access (to pull Docker images, update packages)
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-sg"
  }
}

# ── 4. EC2 Instance (t3.small, Ubuntu 24.04, gp3 25 GB) ───────────────────────
resource "aws_instance" "app_server" {
  ami           = data.aws_ami.ubuntu_24.id
  instance_type = var.instance_type
  key_name      = aws_key_pair.generated_key.key_name

  vpc_security_group_ids = [aws_security_group.web_sg.id]

  root_block_device {
    volume_size           = 25
    volume_type           = "gp3"
    delete_on_termination = true
    tags = {
      Name = "${var.project_name}-root-disk"
    }
  }

  # Bootstrap: install Docker Engine, Compose plugin, create 2GB swap, /opt/app
  user_data = <<-EOF
              #!/bin/bash
              set -e

              # 1. Create 2GB swap to prevent OOM on t3.small
              fallocate -l 2G /swapfile
              chmod 600 /swapfile
              mkswap /swapfile
              swapon /swapfile
              echo '/swapfile none swap sw 0 0' >> /etc/fstab

              # 2. Update packages and install Docker official dependencies
              apt-get update -y
              apt-get install -y ca-certificates curl gnupg

              # 3. Add Docker official GPG key and repository
              install -m 0755 -d /etc/apt/keyrings
              curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
              chmod a+r /etc/apt/keyrings/docker.asc

              echo \
                "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
                $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
                tee /etc/apt/sources.list.d/docker.list > /dev/null

              # 4. Install Docker Engine and Compose plugin
              apt-get update -y
              apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

              # 5. Enable non-root docker access for ubuntu user
              usermod -aG docker ubuntu

              # 6. Create application directory
              mkdir -p /opt/app
              chown -R ubuntu:ubuntu /opt/app

              echo "Bootstrap completed successfully" > /var/log/bootstrap.log
              EOF

  tags = {
    Name = "${var.project_name}-server"
  }
}

# ── 5. Elastic IP (Static Public IP) ─────────────────────────────────────────
resource "aws_eip" "app_eip" {
  instance = aws_instance.app_server.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-eip"
  }
}

