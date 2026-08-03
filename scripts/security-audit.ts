#!/usr/bin/env tsx

/**
 * Security Audit Script
 * Checks for common vulnerabilities and security best practices
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface AuditResult {
  name: string
  passed: boolean
  message: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
}

const results: AuditResult[] = []

function addResult(
  name: string,
  passed: boolean,
  message: string,
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH'
) {
  results.push({ name, passed, message, severity })
}

function checkNpmAudit() {
  console.log('🔍 Checking npm dependencies...')
  try {
    const output = execSync('npm audit --json', { encoding: 'utf-8' })
    const audit = JSON.parse(output)

    const vulnerabilities = Object.values(audit.vulnerabilities || {})
      .filter((v: any) => v.severity === 'critical' || v.severity === 'high')
      .length

    if (vulnerabilities > 0) {
      addResult(
        'npm audit',
        false,
        `Found ${vulnerabilities} critical/high vulnerabilities`,
        'CRITICAL'
      )
    } else {
      addResult('npm audit', true, 'No critical/high vulnerabilities found', 'HIGH')
    }
  } catch (error) {
    addResult(
      'npm audit',
      false,
      'Could not run npm audit',
      'MEDIUM'
    )
  }
}

function checkEnvSecrets() {
  console.log('🔐 Checking for exposed secrets...')

  const sensitivePatterns = [
    /PRIVATE_KEY|SECRET_KEY|API_KEY|PASSWORD|TOKEN/gi,
    /https?:\/\/[^@\/]+:[^@]+@/gi, // URLs with credentials
  ]

  const filesToCheck = [
    '.env',
    '.env.local',
    '.env.example',
    'next.config.js',
    'prisma/seed.ts',
  ]

  let found = false

  filesToCheck.forEach((file) => {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line, idx) => {
        if (line.includes('=') && !line.startsWith('#')) {
          const [key, value] = line.split('=')
          if (
            value &&
            !value.includes('${') &&
            (value.length > 20 ||
              sensitivePatterns.some((p) => p.test(value)))
          ) {
            console.log(`  ⚠️  Potential secret in ${file}:${idx + 1}`)
            found = true
          }
        }
      })
    }
  })

  if (!found) {
    addResult(
      'Environment Secrets',
      true,
      'No exposed secrets found',
      'CRITICAL'
    )
  } else {
    addResult(
      'Environment Secrets',
      false,
      'Potential secrets found in env files',
      'CRITICAL'
    )
  }
}

function checkContentSecurityPolicy() {
  console.log('🛡️  Checking Content Security Policy...')

  try {
    const nextConfigPath = path.join(process.cwd(), 'next.config.js')
    const content = fs.readFileSync(nextConfigPath, 'utf-8')

    const hasCsp =
      content.includes('Content-Security-Policy') ||
      content.includes('csp') ||
      content.includes('headers')

    if (hasCsp) {
      addResult(
        'Content Security Policy',
        true,
        'CSP headers configured',
        'HIGH'
      )
    } else {
      addResult(
        'Content Security Policy',
        false,
        'CSP headers not found',
        'HIGH'
      )
    }
  } catch (error) {
    addResult(
      'Content Security Policy',
      false,
      'Could not check CSP configuration',
      'MEDIUM'
    )
  }
}

function checkDependencies() {
  console.log('📦 Checking dangerous dependencies...')

  const dangerousDeps = [
    'eval',
    'Function',
    'child_process',
    'exec',
    'spawn',
  ]

  const packageJsonPath = path.join(process.cwd(), 'package.json')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }

  const found = dangerousDeps.filter((dep) => allDeps[dep])

  if (found.length > 0) {
    addResult(
      'Dangerous Dependencies',
      false,
      `Found dangerous packages: ${found.join(', ')}`,
      'HIGH'
    )
  } else {
    addResult(
      'Dangerous Dependencies',
      true,
      'No dangerous packages found',
      'HIGH'
    )
  }
}

function checkCorsConfiguration() {
  console.log('🔄 Checking CORS configuration...')

  try {
    const apiRoutesPath = path.join(process.cwd(), 'app', 'api')
    if (!fs.existsSync(apiRoutesPath)) {
      addResult(
        'CORS Configuration',
        false,
        'API routes directory not found',
        'MEDIUM'
      )
      return
    }

    const files = fs.readdirSync(apiRoutesPath, { recursive: true })
    let hasCorsCheck = false

    files.forEach((file) => {
      if (typeof file === 'string' && file.endsWith('.ts')) {
        const filePath = path.join(apiRoutesPath, file)
        const content = fs.readFileSync(filePath, 'utf-8')

        if (
          content.includes('origin') ||
          content.includes('CORS_ORIGIN') ||
          content.includes('credentials')
        ) {
          hasCorsCheck = true
        }
      }
    })

    if (hasCorsCheck) {
      addResult(
        'CORS Configuration',
        true,
        'CORS validation found in API routes',
        'HIGH'
      )
    } else {
      addResult(
        'CORS Configuration',
        false,
        'CORS validation not found in API routes',
        'HIGH'
      )
    }
  } catch (error) {
    addResult(
      'CORS Configuration',
      false,
      'Could not check CORS configuration',
      'MEDIUM'
    )
  }
}

function checkAuthImplementation() {
  console.log('🔐 Checking authentication implementation...')

  const authFilesPath = path.join(process.cwd(), 'services', 'auth.ts')

  if (!fs.existsSync(authFilesPath)) {
    addResult(
      'Authentication',
      false,
      'Auth service not found',
      'CRITICAL'
    )
    return
  }

  const content = fs.readFileSync(authFilesPath, 'utf-8')

  const checks = {
    'JWT or session validation': /jwt|session|token/i,
    'Password hashing': /bcrypt|hash|scrypt/i,
    'SQL injection prevention': /parameterized|prisma|prepared/i,
    'Rate limiting': /rate.?limit|throttle/i,
  }

  let allPassed = true
  Object.entries(checks).forEach(([check, regex]) => {
    if (!regex.test(content)) {
      console.log(`  ⚠️  Missing: ${check}`)
      allPassed = false
    }
  })

  if (allPassed) {
    addResult(
      'Authentication Implementation',
      true,
      'All security checks passed',
      'CRITICAL'
    )
  } else {
    addResult(
      'Authentication Implementation',
      false,
      'Some security checks missing',
      'CRITICAL'
    )
  }
}

function checkInputValidation() {
  console.log('✔️  Checking input validation...')

  const libPath = path.join(process.cwd(), 'lib', 'validations')

  if (!fs.existsSync(libPath)) {
    addResult(
      'Input Validation',
      false,
      'Validation schemas not found',
      'HIGH'
    )
    return
  }

  const files = fs.readdirSync(libPath)

  if (files.length === 0) {
    addResult(
      'Input Validation',
      false,
      'No validation schemas found',
      'HIGH'
    )
  } else {
    addResult(
      'Input Validation',
      true,
      `Found ${files.length} validation schemas`,
      'HIGH'
    )
  }
}

function checkDatabaseSecurity() {
  console.log('🗄️  Checking database security...')

  const prismaSchemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma')

  if (!fs.existsSync(prismaSchemaPath)) {
    addResult(
      'Database Security',
      false,
      'Prisma schema not found',
      'CRITICAL'
    )
    return
  }

  const content = fs.readFileSync(prismaSchemaPath, 'utf-8')

  // Check for Prisma best practices
  const checks = {
    'Has unique constraints':
      /@unique|@@unique/i.test(content),
    'Has indexed fields': /@index|@@index/i.test(content),
    'Has relations': /relation|@relation/i.test(content),
  }

  const passedChecks = Object.values(checks).filter(Boolean).length

  if (passedChecks === Object.keys(checks).length) {
    addResult(
      'Database Security',
      true,
      'All database security practices found',
      'CRITICAL'
    )
  } else {
    addResult(
      'Database Security',
      false,
      `Only ${passedChecks}/${Object.keys(checks).length} checks passed`,
      'CRITICAL'
    )
  }
}

function checkErrorHandling() {
  console.log('🚨 Checking error handling...')

  try {
    const apiPath = path.join(process.cwd(), 'app', 'api')
    if (!fs.existsSync(apiPath)) {
      addResult(
        'Error Handling',
        false,
        'API routes not found',
        'MEDIUM'
      )
      return
    }

    const files = fs.readdirSync(apiPath, { recursive: true })
    let hasTryCatch = false

    files.forEach((file) => {
      if (typeof file === 'string' && file.endsWith('.ts')) {
        const filePath = path.join(apiPath, file)
        const content = fs.readFileSync(filePath, 'utf-8')

        if (content.includes('try') && content.includes('catch')) {
          hasTryCatch = true
        }
      }
    })

    if (hasTryCatch) {
      addResult(
        'Error Handling',
        true,
        'Error handling patterns found',
        'HIGH'
      )
    } else {
      addResult(
        'Error Handling',
        false,
        'No error handling patterns found',
        'HIGH'
      )
    }
  } catch (error) {
    addResult(
      'Error Handling',
      false,
      'Could not check error handling',
      'MEDIUM'
    )
  }
}

function generateReport() {
  console.log('\n\n' + '='.repeat(60))
  console.log('📋 SECURITY AUDIT REPORT')
  console.log('='.repeat(60))

  const grouped = {
    CRITICAL: results.filter((r) => r.severity === 'CRITICAL'),
    HIGH: results.filter((r) => r.severity === 'HIGH'),
    MEDIUM: results.filter((r) => r.severity === 'MEDIUM'),
    LOW: results.filter((r) => r.severity === 'LOW'),
  }

  let totalFailed = 0

  Object.entries(grouped).forEach(([severity, items]) => {
    console.log(`\n${severity} Priority:`)
    console.log('-'.repeat(60))

    items.forEach((result) => {
      const icon = result.passed ? '✅' : '❌'
      console.log(`${icon} ${result.name}: ${result.message}`)

      if (!result.passed) {
        totalFailed++
      }
    })
  })

  console.log('\n' + '='.repeat(60))
  console.log(`Total Checks: ${results.length}`)
  console.log(`Passed: ${results.filter((r) => r.passed).length}`)
  console.log(`Failed: ${totalFailed}`)
  console.log('='.repeat(60))

  // Save report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const reportPath = path.join(
    process.cwd(),
    'reports',
    `security-audit-${timestamp}.json`
  )

  const dir = path.dirname(reportPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
  console.log(`\n📄 Report saved to ${reportPath}`)

  return totalFailed === 0
}

async function main() {
  console.log('🔐 Starting Security Audit...\n')

  checkNpmAudit()
  checkEnvSecrets()
  checkContentSecurityPolicy()
  checkDependencies()
  checkCorsConfiguration()
  checkAuthImplementation()
  checkInputValidation()
  checkDatabaseSecurity()
  checkErrorHandling()

  const passed = generateReport()

  if (!passed) {
    console.log('\n❌ Security audit failed. Please fix the issues above.')
    process.exit(1)
  } else {
    console.log('\n✅ All security checks passed!')
    process.exit(0)
  }
}

main()
