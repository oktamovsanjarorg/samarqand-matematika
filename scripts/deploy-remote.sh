#!/usr/bin/env bash
# Noutbukdan: serverdagi deploy skriptini ishga tushiradi (main allaqachon push qilingan bo'lishi kerak)
set -euo pipefail
ssh -o ControlMaster=no -o ControlPath=none samarqand-prod /home/ubuntu/samarqand/scripts/deploy.sh
