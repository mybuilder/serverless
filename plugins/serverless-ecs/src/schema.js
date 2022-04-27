module.exports = {
  type: 'object',
  additionalProperties: false,
  properties: {
    clusterArn: { type: 'string' },
    memory: { type: 'string' },
    cpu: { type: 'integer' },
    environment: { type: 'object' },
    executionRoleArn: { type: 'string' },
    taskRoleArn: { type: 'string' },
    logGroupName: { type: 'string' },
    iamRoleStatements: { type: 'array' },
    iamManagedPolicies: { type: 'array', items: { type: 'string' } },
    tags: {
      type: 'object',
      patternProperties: {
        '^.+$': { type: 'string' },
      },
    },
    tasks: {
      type: 'object',
      patternProperties: {
        '^[a-zA-Z0-9-]+$': {
          type: 'object',
          properties: {
            name: { type: 'string' },
            image: { type: 'string' },
            executionRoleArn: { type: 'string' },
            taskRoleArn: { type: 'string' },
            command: { type: 'array', items: { type: 'string' } },
            entryPoint: { type: 'array', items: { type: 'string' } },
            memory: { type: 'string' },
            cpu: { type: 'integer' },
            environment: { type: 'object' },
            tags: { type: 'object' },
            service: {
              type: 'object',
              properties: {
                desiredCount: { type: 'integer' },
                maximumPercent: { type: 'integer' },
                minimumHealthyPercent: { type: 'integer' },
              },
            },
            schedule: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
    },
  },
};
