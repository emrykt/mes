# One-command image deploy: package the committed source, build in AWS CodeBuild,
# push :latest to ECR. App Runner (autoDeploymentsEnabled) then redeploys itself.
#
#   powershell -File scripts/deploy-image.ps1
#
# Prereqs: AWS CLI configured (eu-central-1), the CDK stack already deployed
# (ECR repo + CodeBuild project + App Runner exist). Run from the repo root.

$ErrorActionPreference = "Stop"
chcp 65001 | Out-Null
$env:PYTHONUTF8 = "1"
$aws = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
$bucket = "prodgence-build-385542056888"
$project = "prodgence-build"

Write-Host "1/3  Packaging committed source (git archive HEAD)..."
git archive --format=zip -o build-source.zip HEAD
& $aws s3 cp build-source.zip "s3://$bucket/source.zip"
Remove-Item build-source.zip

Write-Host "2/3  Starting CodeBuild..."
$id = (& $aws codebuild start-build --project-name $project --query "build.id" --output text)
Write-Host "     build id: $id"

Write-Host "3/3  Waiting for the build to finish..."
do {
  Start-Sleep -Seconds 20
  $status = (& $aws codebuild batch-get-builds --ids $id --query "builds[0].buildStatus" --output text)
  Write-Host "     status: $status"
} while ($status -eq "IN_PROGRESS")

if ($status -eq "SUCCEEDED") {
  Write-Host "Image pushed. App Runner will auto-redeploy from :latest." -ForegroundColor Green
} else {
  Write-Host "Build $status - check CloudWatch /aws/codebuild/$project." -ForegroundColor Red
  exit 1
}
