# AI-Powered Job Application Tracker Deployment Script for Windows
# Target Server: 46.62.205.150

Write-Host "🚀 Starting deployment to 46.62.205.150..." -ForegroundColor Green

# Build the application
Write-Host "📦 Building the application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Yellow
npm run db:generate

Write-Host "🎉 Application is ready for deployment!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Upload the entire 'job-tracker' folder to your server at 46.62.205.150" -ForegroundColor White
Write-Host "2. Install Node.js and PostgreSQL on the server" -ForegroundColor White
Write-Host "3. Set up environment variables (.env.local)" -ForegroundColor White
Write-Host "4. Run 'npm install' on the server" -ForegroundColor White
Write-Host "5. Run 'npm run db:push' to set up the database" -ForegroundColor White
Write-Host "6. Run 'npm start' to start the application" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Application will be available at: http://46.62.205.150:3000" -ForegroundColor Green
Write-Host ""
Write-Host "📖 See DEPLOYMENT.md for detailed instructions" -ForegroundColor Cyan
