#!/usr/bin/env python3

import subprocess

print("🚀 BOBU Developer CLI")
print("=" * 30)

status = subprocess.run(["git", "status"])
