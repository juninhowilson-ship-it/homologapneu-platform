#!/bin/bash

set -e

echo "🔨 Building project..."
npm run build

echo "✅ Build successful!"

echo "📊 Build stats:"
du -sh .next/

echo "✨ Ready for deployment!"
