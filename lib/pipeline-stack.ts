import * as _ from 'lodash';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { WorkshopPipelineStage } from './pipeline-stage';
import { CodeBuildStep, CodePipeline, CodePipelineSource } from "aws-cdk-lib/pipelines";

export class WorkshopPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // This creates a new CodeCommit repository called 'WorkshopRepo'
    const repoName = _.get(process, 'env.GITHUB_USER', 'guru-workshop');

    // The basic pipeline declaration. This sets the initial structure
    // of our pipeline
    const gitHubUser = _.get(process, 'env.GITHUB_USER', 'mwithington');
    const branchName = _.get(process, 'env.BRANCH_NAME', 'main');
    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'WorkshopPipeline',
      synth: new CodeBuildStep('SynthStep', {
        input: CodePipelineSource.gitHub(`${gitHubUser}/${repoName}`, branchName, {
          authentication: cdk.SecretValue.secretsManager('github-token'),
        }),
        installCommands: [
          'npm install -g aws-cdk'
        ],
        commands: [
          'npm ci',
          'npm run build',
          'npx cdk synth'
        ]
      }
      )
    });

    const pipelineWave = pipeline.addWave('us-wave');

    // Main region deploy
    const deploy = new WorkshopPipelineStage(this, 'EastDeploy', {
      env: {
        region: 'us-east-1'
      }
    });
    // Sub region deploy
    // const deploySubRegion = new WorkshopPipelineStage(this, 'WestDeploy', {
    //   env: {
    //     region: 'us-west-2'
    //   }
    // });
    // pipelineWave.addStage(deploySubRegion);
    const deployStage = pipelineWave.addStage(deploy);
    // pipelineWave.addStage(deploy);

    deployStage.addPost(
      new CodeBuildStep('TestViewerEndpoint', {
        projectName: 'TestViewerEndpoint',
        envFromCfnOutputs: {
          ENDPOINT_URL: deploy.hcViewerUrl
        },
        commands: [
          'curl -Ssf $ENDPOINT_URL'
        ]
      }),
      new CodeBuildStep('TestAPIGatewayEndpoint', {
        projectName: 'TestAPIGatewayEndpoint',
        envFromCfnOutputs: {
          ENDPOINT_URL: deploy.hcEndpoint
        },
        commands: [
          'curl -Ssf $ENDPOINT_URL',
          'curl -Ssf $ENDPOINT_URL/hello',
          'curl -Ssf $ENDPOINT_URL/test'
        ]
      })
    )
  }
}
