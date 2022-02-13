import { App } from 'aws-cdk-lib';
import { WorkshopPipelineStack } from "../lib/pipeline-stack";
import * as _ from 'lodash';

const app = new App();
const awsAccount = _.get(process, 'env.AWS_ACCOUNT');
console.log(awsAccount);

new WorkshopPipelineStack(app, 'CdkWorkshopPipelineStack', {
    env: {
        region: 'us-east-1',
        account: awsAccount
    }
});
