'use strict';

const toIdentifier = name => {
  const id = name.replace(/[^0-9A-Za-z]/g, '');
  return id.charAt(0).toUpperCase() + id.slice(1);
};

const toTags = tags =>
  Object.entries(tags).map(([Key, Value]) => ({ Key, Value }));

const toEnvironment = tags =>
  Object.entries(tags).map(([Name, Value]) => ({ Name, Value }));

const compileLogGroup = config => ({
  Resources: {
    EcsTasksLogGroup: {
      Type: 'AWS::Logs::LogGroup',
      Properties: {
        LogGroupName: config.logGroupName,
        Tags: toTags(config.tags),
      },
    },
  },
  Outputs: {},
});

const compileIamRoles = config => ({
  Resources: {
    EcsIamExecutionRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: ['ecs-tasks.amazonaws.com', 'events.amazonaws.com'],
              },
              Action: ['sts:AssumeRole'],
            },
          ],
        },
        ManagedPolicyArns: [
          'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
          'arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceEventsRole',
        ],
        Tags: toTags(config.tags),
      },
    },
    EcsIamTaskRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: ['ecs-tasks.amazonaws.com'],
              },
              Action: ['sts:AssumeRole'],
            },
          ],
        },
        Policies:
          config.iamRoleStatements.length > 0
            ? [
                {
                  PolicyName: 'EcsTaskPolicy',
                  PolicyDocument: {
                    Version: '2012-10-17',
                    Statement: config.iamRoleStatements,
                  },
                },
              ]
            : [],
        ManagedPolicyArns: config.iamManagedPolicies,
        Tags: toTags(config.tags),
      },
    },
  },
  Outputs: {},
});

const compileTaskDefinition = (images, task) => ({
  Type: 'AWS::ECS::TaskDefinition',
  Properties: {
    ContainerDefinitions: [
      {
        Name: task.name,
        Image: images[task.name],
        Environment: toEnvironment(task.environment),
        EntryPoint: task.entryPoint,
        Command: task.command,
        Memory: task.memory,
        Cpu: task.cpu,
        MemoryReservation: 128,
        LogConfiguration: {
          LogDriver: 'awslogs',
          Options: {
            'awslogs-region': { 'Fn::Sub': '${AWS::Region}' },
            'awslogs-group': {
              'Fn::Sub': '${EcsTasksLogGroup}',
            },
            'awslogs-stream-prefix': 'ecs',
          },
        },
      },
    ],
    Family: task.name,
    NetworkMode: 'bridge',
    ExecutionRoleArn: task.executionRoleArn || {
      'Fn::Sub': '${EcsIamExecutionRole}',
    },
    TaskRoleArn: task.taskRoleArn || {
      'Fn::Sub': '${EcsIamTaskRole}',
    },
    RequiresCompatibilities: ['EC2'],
    Tags: toTags(task.tags),
  },
});

const compileScheduledTask = (identifier, task) => ({
  Type: 'AWS::Events::Rule',
  Properties: {
    ScheduleExpression: task.schedule,
    Targets: [
      {
        Id: identifier,
        Arn: task.clusterArn,
        RoleArn: {
          'Fn::GetAtt': ['EcsIamExecutionRole', 'Arn'],
        },
        EcsParameters: {
          TaskDefinitionArn: {
            'Fn::Sub': '${' + identifier + 'Task}',
          },
          TaskCount: 1,
        },
      },
    ],
  },
});

const compileService = (identifier, task) => ({
  Type: 'AWS::ECS::Service',
  Properties: {
    Cluster: task.clusterArn,
    ServiceName: task.name,
    DesiredCount: task.service.desiredCount,
    DeploymentConfiguration: {
      MaximumPercent: task.service.maximumPercent,
      MinimumHealthyPercent: task.service.minimumHealthyPercent,
    },
    TaskDefinition: { 'Fn::Sub': '${' + identifier + 'Task}' },
    PropagateTags: 'TASK_DEFINITION',
    Tags: toTags(task.tags),
  },
});

const compileTask = (images, task) => {
  const identifier = toIdentifier(task.name);

  if (task.schedule) {
    return {
      Resources: {
        [identifier + 'Task']: compileTaskDefinition(images, task),
        [identifier + 'ScheduledTask']: compileScheduledTask(identifier, task),
      },
      Outputs: {},
    };
  }

  return {
    Resources: {
      [identifier + 'Task']: compileTaskDefinition(images, task),
      [identifier + 'Service']: compileService(identifier, task),
    },
    Outputs: {},
  };
};

module.exports = (images, config) => {
  const logGroup = compileLogGroup(config);
  const iamRoles = compileIamRoles(config);
  const tasks = config.tasks.reduce(({ Resources, Outputs }, task) => {
    const compiled = compileTask(images, task);
    return {
      Resources: { ...Resources, ...compiled.Resources },
      Outputs: { ...Outputs, ...compiled.Outputs },
    };
  }, {});

  return {
    Resources: {
      ...logGroup.Resources,
      ...iamRoles.Resources,
      ...tasks.Resources,
    },
    Outputs: {
      ...logGroup.Outputs,
      ...iamRoles.Outputs,
      ...tasks.Outputs,
    },
  };
};
