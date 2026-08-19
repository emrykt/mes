import {
  Stack,
  StackProps,
  CfnOutput,
  Duration,
  RemovalPolicy,
} from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apprunner from "aws-cdk-lib/aws-apprunner";
import { Construct } from "constructs";

/**
 * Prodgence production infrastructure — everything in eu-central-1 (Frankfurt).
 *
 *   VPC (2 AZ, 1 NAT) → RDS PostgreSQL (private, encrypted) → App Runner
 *   (container from ECR, reaches RDS through a VPC connector).
 *
 * Two-phase first deploy (see docs/aws-deploy.md): deploy WITHOUT the App Runner
 * service to create the ECR repo + DB, push the first image, then re-deploy with
 * `-c withService=true` so App Runner has an image to run.
 */
export class ProdgenceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const withService = this.node.tryGetContext("withService") === "true";

    // ---- Network -------------------------------------------------------
    const vpc = new ec2.Vpc(this, "Vpc", { maxAzs: 2, natGateways: 1 });

    // ---- Database (PostgreSQL) ----------------------------------------
    const db = new rds.DatabaseInstance(this, "Db", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE4_GRAVITON,
        ec2.InstanceSize.MICRO,
      ),
      allocatedStorage: 20,
      credentials: rds.Credentials.fromGeneratedSecret("prodgence"),
      databaseName: "prodgence",
      multiAz: false, // flip to true for HA when commercial
      storageEncrypted: true,
      // Free-plan accounts cannot use multi-day backups; keep 0 during the
      // trial phase, raise to 7 (and enable maxAllocatedStorage/multiAz) after
      // upgrading the AWS account plan — before real customer data.
      backupRetention: Duration.days(0),
      deletionProtection: true,
      removalPolicy: RemovalPolicy.SNAPSHOT,
    });

    // ---- Container registry -------------------------------------------
    const repo = new ecr.Repository(this, "Repo", {
      repositoryName: "prodgence",
      imageScanOnPush: true,
      lifecycleRules: [{ maxImageCount: 10 }],
      // CDK's ECR default is RETAIN; use DESTROY so a failed/rolled-back stack
      // cleans the repo up instead of orphaning it (images are re-pushable).
      removalPolicy: RemovalPolicy.DESTROY,
      emptyOnDelete: true,
    });

    new CfnOutput(this, "EcrRepoUri", { value: repo.repositoryUri });
    new CfnOutput(this, "DbEndpoint", { value: db.dbInstanceEndpointAddress });
    new CfnOutput(this, "DbSecretArn", { value: db.secret!.secretArn });

    if (!withService) return; // phase 1: infra only (push an image first)

    // ---- App Runner (container) ---------------------------------------
    const accessRole = new iam.Role(this, "AppRunnerAccessRole", {
      assumedBy: new iam.ServicePrincipal("build.apprunner.amazonaws.com"),
    });
    repo.grantPull(accessRole);

    const instanceRole = new iam.Role(this, "AppRunnerInstanceRole", {
      assumedBy: new iam.ServicePrincipal("tasks.apprunner.amazonaws.com"),
    });
    db.secret!.grantRead(instanceRole);

    const connectorSg = new ec2.SecurityGroup(this, "ConnectorSg", { vpc });
    db.connections.allowDefaultPortFrom(connectorSg, "App Runner → RDS");

    const vpcConnector = new apprunner.CfnVpcConnector(this, "VpcConnector", {
      subnets: vpc.selectSubnets({
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      }).subnetIds,
      securityGroups: [connectorSg.securityGroupId],
    });

    const service = new apprunner.CfnService(this, "Service", {
      serviceName: "prodgence",
      sourceConfiguration: {
        authenticationConfiguration: { accessRoleArn: accessRole.roleArn },
        autoDeploymentsEnabled: true, // redeploy when a new :latest is pushed
        imageRepository: {
          imageRepositoryType: "ECR",
          imageIdentifier: `${repo.repositoryUri}:latest`,
          imageConfiguration: {
            port: "3000",
            runtimeEnvironmentVariables: [
              { name: "NODE_ENV", value: "production" },
              { name: "PGHOST", value: db.dbInstanceEndpointAddress },
              { name: "PGPORT", value: db.dbInstanceEndpointPort },
              { name: "PGDATABASE", value: "prodgence" },
              { name: "PGUSER", value: "prodgence" },
              { name: "PGSSLMODE", value: "require" },
            ],
            runtimeEnvironmentSecrets: [
              // RDS password injected from Secrets Manager (never in plaintext)
              { name: "PGPASSWORD", value: `${db.secret!.secretArn}:password::` },
              // Add ANTHROPIC_API_KEY / SES creds here once stored as secrets.
            ],
          },
        },
      },
      instanceConfiguration: {
        cpu: "1 vCPU",
        memory: "2 GB",
        instanceRoleArn: instanceRole.roleArn,
      },
      networkConfiguration: {
        egressConfiguration: {
          egressType: "VPC",
          vpcConnectorArn: vpcConnector.attrVpcConnectorArn,
        },
      },
      healthCheckConfiguration: {
        protocol: "HTTP",
        path: "/api/auth/me",
        interval: 10,
        timeout: 5,
        healthyThreshold: 1,
        unhealthyThreshold: 5,
      },
    });

    new CfnOutput(this, "ServiceUrl", {
      value: `https://${service.attrServiceUrl}`,
    });
  }
}
