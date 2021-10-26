'use strict';

class ServerlessPlugin {
  constructor(serverless) {
    const {
      lambdaFuncAlias,
      throwOnMissingDeployedFuncArnsJsonPath = true,
    } = serverless.service.custom;

    if (lambdaFuncAlias === undefined) {
      return;
    }

    const { DEPLOYED_FUNC_ARNS_JSON_PATH: jsonPath } = process.env;

    if (jsonPath === undefined) {
      if (throwOnMissingDeployedFuncArnsJsonPath) {
        throw new Error('Cannot deploy without a DEPLOYED_FUNC_ARNS_JSON_PATH env var');
      }
      return;
    }

    this.lambdaFuncAlias = lambdaFuncAlias;
    this.deployedFuncArnsJsonPath = jsonPath;
    this.serverless = serverless;

    this.commands = {
      'deploy:activate': {
        lifecycleEvents: ['invoke'],
        usage: 'Activate the Lambda function versions in the JSON file given by the `DEPLOYED_FUNC_ARNS_JSON_PATH` env var',
      },
    };

    this.hooks = {
      'before:package:finalize': this.appendFuncAliasToApiGatewayMethods.bind(this),
      'after:deploy:deploy': this.writeDeployedFuncArnsToFile.bind(this),
      'deploy:activate:invoke': this.activateDeployedFuncArns.bind(this),
    };
  }

  appendFuncAliasToApiGatewayMethods() {
    const resources = this.serverless.service.provider.compiledCloudFormationTemplate.Resources;

    for (const key in resources) {
      if (resources[key].Type !== 'AWS::ApiGateway::Method') {
        continue;
      }

      const uriParts = resources[key].Properties.Integration.Uri['Fn::Join'][1];
      uriParts[uriParts.length - 1] = `:${this.lambdaFuncAlias}/invocations`;
    }
  }

  async writeDeployedFuncArnsToFile() {
    const response = await this.aws.request(
      'CloudFormation',
      'describeStacks',
      { StackName: this.stackName },
      this.aws.getStage(),
      this.aws.getRegion()
    );

    const [stack] = response.Stacks;

    const funcArns = stack.Outputs
      .filter(({ OutputKey: key }) => key.endsWith('LambdaFunctionQualifiedArn'))
      .map(({ OutputValue: value }) => {
        const indexOfLastColon = value.lastIndexOf(':');

        return {
          funcArn: value.substr(0, indexOfLastColon),
          funcVersion: value.substr(indexOfLastColon + 1),
          funcAlias: this.lambdaFuncAlias,
        };
      });

    require('fs').writeFileSync(this.deployedFuncArnsJsonPath, JSON.stringify(funcArns));
  }

  async activateDeployedFuncArns() {
    const lambda = new this.aws.sdk.Lambda({
      region: this.aws.getRegion(),
      credentials: this.aws.getCredentials().credentials,
    });

    const funcArns = JSON.parse(require('fs').readFileSync(this.deployedFuncArnsJsonPath));

    for (const { funcArn, funcVersion, funcAlias } of funcArns) {
      const aliasParams = {
        FunctionName: funcArn,
        FunctionVersion: funcVersion,
        Name: funcAlias,
      };

      try {
        await lambda.createAlias(aliasParams).promise();

        const permissionParams = {
          FunctionName: funcArn,
          Qualifier: funcAlias,
          SourceArn: await this.buildApiGatewayArn(),
          Action: 'lambda:InvokeFunction',
          Principal: 'apigateway.amazonaws.com',
          StatementId: 'AllowInvokeViaApiGateway',
        };

        await lambda.addPermission(permissionParams).promise();
      } catch (err) {
        if (err.statusCode !== 409) {
          throw err;
        }
        await lambda.updateAlias(aliasParams).promise();
      }
    }
  }

  async buildApiGatewayArn() {
    return `arn:aws:execute-api:${this.aws.getRegion()}:${await this.aws.getAccountId()}:*/*/*`;
  }

  get stackName () {
    return `${this.serverless.service.getServiceName()}-${this.aws.getStage()}`;
  }

  get aws() {
    return this.serverless.getProvider('aws');
  }
}

module.exports = ServerlessPlugin;
