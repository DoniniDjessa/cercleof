#!/bin/bash
# Script to reduce text sizes across all admin pages
# This script reduces text sizes: text-3xl -> text-lg, text-2xl -> text-base, text-xl -> text-sm, text-lg -> text-sm

find app/admin -name "*.tsx" -type f | while read file; do
  sed -i 's/text-3xl/text-lg/g' "$file"
  sed -i 's/text-2xl/text-base/g' "$file"
  sed -i 's/text-xl/text-sm/g' "$file"
  # Only replace text-lg if it's not already been replaced
  sed -i 's/\btext-lg\b/text-sm/g' "$file"
done

echo "Text sizes reduced across all admin pages"

