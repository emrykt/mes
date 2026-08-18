#!/usr/bin/env node
import "source-map-support/register";
import { App } from "aws-cdk-lib";
import { ProdgenceStack } from "../lib/prodgence-stack";

const app = new App();

new ProdgenceStack(app, "ProdgenceStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "eu-central-1", // Frankfurt
  },
  description: "Prodgence production stack (Frankfurt): VPC + RDS + ECR + App Runner",
});
