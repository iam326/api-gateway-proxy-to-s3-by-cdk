import * as cdk from '@aws-cdk/core';
import * as apigateway from '@aws-cdk/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';

export class ApiGatewayProxyToS3ByCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const projectName: string = this.node.tryGetContext('projectName');

    const bucket = new s3.Bucket(this, 'Bucket', {
      bucketName: `${projectName}-bucket`,
    });

    const restApiRole = new iam.Role(this, 'Role', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      path: '/',
    });
    bucket.grantReadWrite(restApiRole);

    const restApi = new apigateway.RestApi(this, 'RestApi', {
      restApiName: `${projectName}-api`,
      deployOptions: {
        stageName: 'v1',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['POST', 'OPTIONS', 'PUT', 'DELETE'],
        statusCode: 200,
      },
      binaryMediaTypes: ['image/*'],
    });

    const users = restApi.root.addResource('users');
    const userId = users.addResource('{userId}');
    const files = userId.addResource('files');
    const fileName = files.addResource('{fileName}');

    fileName.addMethod(
      'GET',
      new apigateway.AwsIntegration({
        service: 's3',
        integrationHttpMethod: 'GET',
        path: `${bucket.bucketName}/{folder}/{object}`,
        options: {
          credentialsRole: restApiRole,
          passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
          requestParameters: {
            'integration.request.header.Accept': 'method.request.header.Accept',
            'integration.request.path.folder': 'method.request.path.userId',
            'integration.request.path.object': 'method.request.path.fileName',
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
          'method.request.header.Accept': true,
          'method.request.path.userId': true,
          'method.request.path.fileName': true,
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

    fileName.addMethod(
      'PUT',
      new apigateway.AwsIntegration({
        service: 's3',
        integrationHttpMethod: 'PUT',
        path: `${bucket.bucketName}/{folder}/{object}`,
        options: {
          credentialsRole: restApiRole,
          passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
          requestParameters: {
            'integration.request.header.Content-Type':
              'method.request.header.Content-Type',
            'integration.request.path.folder': 'method.request.path.userId',
            'integration.request.path.object': 'method.request.path.fileName',
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
          'method.request.header.Content-Type': true,
          'method.request.path.userId': true,
          'method.request.path.fileName': true,
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
