#!/usr/bin/env node

/**
 * Performance Testing: Lighthouse CI
 * Target: >90 in all categories
 * PageSpeed Insights: <2s First Contentful Paint
 */

const lighthouse = require('lighthouse')
const chromeLauncher = require('chrome-launcher')
const fs = require('fs')
const path = require('path')

const LIGHTHOUSE_CONFIG = {
  logLevel: 'info',
  output: 'json',
  onlyCategories: [
    'performance',
    'accessibility',
    'best-practices',
    'seo',
    'pwa',
  ],
  chromeFlags: [
    '--show-paint-rects',
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
  ],
}

const THRESHOLDS = {
  performance: 90,
  accessibility: 90,
  'best-practices': 85,
  seo: 90,
  pwa: 80,
}

const URLS_TO_TEST = [
  'http://localhost:3000/', // Landing page
  'http://localhost:3000/dashboard', // Dashboard
  'http://localhost:3000/login', // Login
]

const MOBILE_VIEWPORT = {
  width: 375,
  height: 667,
}

const DESKTOP_VIEWPORT = {
  width: 1440,
  height: 900,
}

async function runLighthouse(url, config) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: config.chromeFlags,
  })

  try {
    const options = {
      ...config,
      port: chrome.port,
    }

    const runnerResult = await lighthouse(url, options)

    return runnerResult.lhr
  } finally {
    await chrome.kill()
  }
}

async function testUrl(url, viewport, viewportName) {
  console.log(`\n📊 Testing ${url} - ${viewportName}`)
  console.log('='.repeat(60))

  const config = {
    ...LIGHTHOUSE_CONFIG,
    emulatedFormFactor: viewportName === 'Mobile' ? 'mobile' : 'desktop',
  }

  const result = await runLighthouse(url, config)

  return {
    url,
    viewport: viewportName,
    timestamp: new Date().toISOString(),
    scores: {
      performance: Math.round(result.categories.performance.score * 100),
      accessibility: Math.round(result.categories.accessibility.score * 100),
      'best-practices': Math.round(
        result.categories['best-practices'].score * 100
      ),
      seo: Math.round(result.categories.seo.score * 100),
      pwa: Math.round((result.categories.pwa?.score || 0) * 100),
    },
    metrics: {
      firstContentfulPaint: result.audits['first-contentful-paint']?.displayValue,
      largestContentfulPaint:
        result.audits['largest-contentful-paint']?.displayValue,
      cumulativeLayoutShift: result.audits['cumulative-layout-shift']?.displayValue,
      totalBlockingTime: result.audits['total-blocking-time']?.displayValue,
      speedIndex: result.audits['speed-index']?.displayValue,
    },
    opportunities: result.audits.unused-css?.details?.items
      ?.slice(0, 3)
      .map((item) => item.url),
  }
}

function printResults(results) {
  console.log('\n\n📈 LIGHTHOUSE REPORT')
  console.log('='.repeat(60))

  results.forEach((result) => {
    console.log(
      `\n${result.url} (${result.viewport})`
    )
    console.log('-'.repeat(60))

    // Print scores
    Object.entries(result.scores).forEach(([category, score]) => {
      const threshold = THRESHOLDS[category] || 0
      const status = score >= threshold ? '✅' : '❌'
      const bar =
        '█'.repeat(Math.floor(score / 10)) +
        '░'.repeat(10 - Math.floor(score / 10))
      console.log(`${status} ${category.padEnd(18)} ${bar} ${score}/100`)
    })

    // Print metrics
    console.log('\n📊 Core Web Vitals:')
    console.log(`  • FCP: ${result.metrics.firstContentfulPaint}`)
    console.log(`  • LCP: ${result.metrics.largestContentfulPaint}`)
    console.log(`  • CLS: ${result.metrics.cumulativeLayoutShift}`)
    console.log(`  • TBT: ${result.metrics.totalBlockingTime}`)
    console.log(`  • Speed Index: ${result.metrics.speedIndex}`)

    if (result.opportunities?.length) {
      console.log('\n💡 Opportunities:')
      result.opportunities.forEach((opp) => {
        console.log(`  • ${opp}`)
      })
    }
  })
}

function checkThresholds(results) {
  let passed = true

  results.forEach((result) => {
    Object.entries(result.scores).forEach(([category, score]) => {
      const threshold = THRESHOLDS[category]
      if (score < threshold) {
        console.error(
          `❌ ${result.url} (${result.viewport}) ${category}: ${score}/${threshold}`
        )
        passed = false
      }
    })

    // Check FCP < 2s
    const fcp = result.metrics.firstContentfulPaint
    if (fcp && parseFloat(fcp) > 2) {
      console.error(
        `❌ ${result.url} (${result.viewport}) FCP is ${fcp} (target: < 2s)`
      )
      passed = false
    }
  })

  return passed
}

function saveResults(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = path.join(
    __dirname,
    '../reports',
    `lighthouse-${timestamp}.json`
  )

  const dir = path.dirname(filename)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(filename, JSON.stringify(results, null, 2))
  console.log(`\n✅ Report saved to ${filename}`)
}

async function main() {
  console.log('🚀 Starting Lighthouse Performance Tests')
  console.log(`Testing ${URLS_TO_TEST.length * 2} configurations...`)

  const results = []

  for (const url of URLS_TO_TEST) {
    try {
      // Desktop
      const desktopResult = await testUrl(url, DESKTOP_VIEWPORT, 'Desktop')
      results.push(desktopResult)

      // Mobile
      const mobileResult = await testUrl(url, MOBILE_VIEWPORT, 'Mobile')
      results.push(mobileResult)
    } catch (error) {
      console.error(`Error testing ${url}:`, error)
    }
  }

  printResults(results)
  saveResults(results)

  const passed = checkThresholds(results)

  if (!passed) {
    console.error(
      '\n❌ Performance targets not met. See report for details.'
    )
    process.exit(1)
  } else {
    console.log('\n✅ All performance targets met!')
    process.exit(0)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
