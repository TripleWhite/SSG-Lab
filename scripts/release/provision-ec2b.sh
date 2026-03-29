#!/usr/bin/env bash
set -euo pipefail

REGION="${REGION:-us-east-1}"
INSTANCE_NAME="${INSTANCE_NAME:-ssg-agent-system}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.xlarge}"
KEY_NAME="${KEY_NAME:-openclaw}"
VOLUME_SIZE_GB="${VOLUME_SIZE_GB:-50}"
SECURITY_GROUP_NAME="${SECURITY_GROUP_NAME:-ssg-agent-system-sg}"
AMI_PARAM="${AMI_PARAM:-/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64}"

require() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

require aws
require jq

default_vpc_id="$(aws ec2 describe-vpcs \
  --region "$REGION" \
  --filters 'Name=is-default,Values=true' \
  --query 'Vpcs[0].VpcId' \
  --output text)"

if [[ -z "$default_vpc_id" || "$default_vpc_id" == "None" ]]; then
  echo "no default VPC found in $REGION" >&2
  exit 1
fi

subnet_id="${SUBNET_ID:-$(aws ec2 describe-subnets \
  --region "$REGION" \
  --filters "Name=vpc-id,Values=${default_vpc_id}" 'Name=default-for-az,Values=true' \
  --query 'sort_by(Subnets,&AvailabilityZone)[0].SubnetId' \
  --output text)}"

if [[ -z "$subnet_id" || "$subnet_id" == "None" ]]; then
  echo "no default subnet found in $REGION for VPC $default_vpc_id" >&2
  exit 1
fi

security_group_id="$(aws ec2 describe-security-groups \
  --region "$REGION" \
  --filters "Name=vpc-id,Values=${default_vpc_id}" "Name=group-name,Values=${SECURITY_GROUP_NAME}" \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null || true)"

if [[ -z "$security_group_id" || "$security_group_id" == "None" ]]; then
  security_group_id="$(aws ec2 create-security-group \
    --region "$REGION" \
    --group-name "$SECURITY_GROUP_NAME" \
    --description "SSG Lab agent system ingress" \
    --vpc-id "$default_vpc_id" \
    --query 'GroupId' \
    --output text)"
fi

# Only expose SSH and HTTPS publicly.
# Paperclip (3000) and OpenClaw (18789) bind to loopback and are
# reverse-proxied through Caddy on 443 — no direct public access needed.
for port in 22 443; do
  aws ec2 authorize-security-group-ingress \
    --region "$REGION" \
    --group-id "$security_group_id" \
    --ip-permissions "[{\"IpProtocol\":\"tcp\",\"FromPort\":${port},\"ToPort\":${port},\"IpRanges\":[{\"CidrIp\":\"0.0.0.0/0\",\"Description\":\"SSG Lab ${port}\"}]}]" \
    >/dev/null 2>&1 || true
done

existing_instance_json="$(aws ec2 describe-instances \
  --region "$REGION" \
  --filters "Name=tag:Name,Values=${INSTANCE_NAME}" 'Name=instance-state-name,Values=pending,running,stopping,stopped' \
  --query 'Reservations[].Instances[] | sort_by(@,&LaunchTime)[-1]' \
  --output json)"

existing_instance_id="$(jq -r '.InstanceId // empty' <<<"$existing_instance_json")"

if [[ -n "$existing_instance_id" ]]; then
  state="$(jq -r '.State.Name' <<<"$existing_instance_json")"
  if [[ "$state" == "stopped" ]]; then
    aws ec2 start-instances --region "$REGION" --instance-ids "$existing_instance_id" >/dev/null
  fi
  instance_id="$existing_instance_id"
else
  ami_id="${AMI_ID:-$(aws ssm get-parameter \
    --region "$REGION" \
    --name "$AMI_PARAM" \
    --query 'Parameter.Value' \
    --output text)}"

  instance_id="$(aws ec2 run-instances \
    --region "$REGION" \
    --image-id "$ami_id" \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$security_group_id" \
    --subnet-id "$subnet_id" \
    --block-device-mappings "[{\"DeviceName\":\"/dev/xvda\",\"Ebs\":{\"VolumeSize\":${VOLUME_SIZE_GB},\"VolumeType\":\"gp3\",\"DeleteOnTermination\":true}}]" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${INSTANCE_NAME}}]" \
    --query 'Instances[0].InstanceId' \
    --output text)"
fi

aws ec2 wait instance-running --region "$REGION" --instance-ids "$instance_id"
aws ec2 wait instance-status-ok --region "$REGION" --instance-ids "$instance_id"

aws ec2 describe-instances \
  --region "$REGION" \
  --instance-ids "$instance_id" \
  --query 'Reservations[0].Instances[0].{
    InstanceId: InstanceId,
    Name: Tags[?Key==`Name`]|[0].Value,
    State: State.Name,
    PublicIp: PublicIpAddress,
    PrivateIp: PrivateIpAddress,
    PublicDnsName: PublicDnsName,
    KeyName: KeyName,
    SecurityGroupId: SecurityGroups[0].GroupId,
    SubnetId: SubnetId,
    VpcId: VpcId,
    AvailabilityZone: Placement.AvailabilityZone
  }' \
  --output json | jq
