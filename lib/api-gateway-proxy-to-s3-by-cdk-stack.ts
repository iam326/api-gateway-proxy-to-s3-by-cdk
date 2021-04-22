import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';

export class ApiGatewayProxyToS3ByCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const projectName = 'api-gateway-proxy-to-s3';

    const bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: `${projectName}-bucket`,
    });

    const restApiRole = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      path: '/',
    });
    bucket.grantRead(restApiRole);

    const restApi = new apigateway.RestApi(this, 'RestApi', {
      restApiName: `${projectName}-api`,
      deployOptions: {
        stageName: 'v1',
      },
    });

    const folder = restApi.root.addResource('{folder}');
    const item = folder.addResource('{item}');
    item.addMethod(
      'GET',
      new apigateway.AwsIntegration({
        service: 's3',
        integrationHttpMethod: 'GET',
        path: '{bucket}/{object}',
        options: {
          credentialsRole: restApiRole,
          passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
          requestParameters: {
            'integration.request.path.object': 'method.request.path.item',
            'integration.request.path.bucket': 'method.request.path.folder',
          },
          integrationResponses: [
            {
              statusCode: '200',
              responseParameters: {
                'method.response.header.Timestamp':
                  'integration.response.header.Date',
                'method.response.header.Content-Length':
                  'integration.response.header.Content-Length',
                'method.response.header.Content-Type':
                  'integration.response.header.Content-Type',
              },
            },
            {
              statusCode: '400',
              selectionPattern: '4\\d{2}',
            },
            {
              statusCode: '500',
              selectionPattern: '5\\d{2}',
            },
          ],
        },
      }),
      {
        requestParameters: {
          'method.request.path.item': true,
          'method.request.path.folder': true,
        },
        methodResponses: [
          {
            statusCode: '200',
            responseParameters: {
              'method.response.header.Timestamp': true,
              'method.response.header.Content-Length': true,
              'method.response.header.Content-Type': true,
            },
          },
          {
            statusCode: '400',
          },
          {
            statusCode: '500',
          },
        ],
      }
    );
  }
}
