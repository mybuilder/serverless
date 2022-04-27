# 🚀 Serverless ECS

Adds the ability to maintain long-running ECS tasks within your Serverless project.

## Example

Below is an example configuration which highlights all possible available options.

```yaml
provider:
  # (required) similar to Lambda-containers, images defined within the provider are available to tasks.
  ecr:
    images:
      my-task:
        path: ./
        file: Dockerfile

  # (optional) role statements present within the provider are added to the task role.
  iamRoleStatements:
    - Effect: Allow
      Action: 'sqs:*'
      Resource: '*'

  # (optional) managed polices present within the provider are added to the task role.
  iamManagedPolicies:
    - arn:aws:iam::123456:policy/my-managed-provider-policy

  # (optional) environment variables present within the provider are added to all tasks.
  environment:
    name: value

  # (optional) tags present within the provider are added to task resources.
  tags:
    name: value

ecs:
  # (required) you must set the default capacity provider on the cluster as this is what is used for task execution.
  clusterArn: 'arn:aws:ecs:eu-west-1:123456:cluster/MyCluster'

  # (optional) default memory you wish to allocate to each task (if not supplied at the task level)
  # https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#task_size
  memory: '0.5GB'

  # (optional) default CPU you wish to allocate to each task (if not supplied at the task level)
  # https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#task_size
  cpu: 256

  # (optional) environment variables which are added to all tasks.
  environment:
    name: value

  # (optional) name used for the provisoned log group
  logGroupName: my-cluster-log-group

  # (optional) default execution role ARN you wish to use for the task.
  executionRoleArn: arn:aws:iam::123456:role/my-custom-execution-role

  # (optional) default task role ARN you wish to use for the task.
  taskRoleArn: arn:aws:iam::123456:role/my-custom-task-role

  # (optional) additional role statements you wish to add to the task role, you would place statements here instead of at
  # the provider level if you only wished them to target Fargate tasks.
  iamRoleStatements:
    - Effect: Allow
      Action: 'resource:*'
      Resource: '*'

  # (optional) additional managed policies you wish to add to the task role, you would place policies here instead of at
  # the provider level if you only wished them to target Fargate tasks.
  iamManagedPolicies:
    - arn:aws:iam::123456:policy/my-managed-task-policy

  # (optional) additional tags you wish to apply to only Fargate task resources.
  tags:
    name: value

  tasks:
    my-task:
      # (optional) unique name for the given task, defaults to the task key name.
      name: my-task-name

      # (required) the task image you wish to run, references images built within the `ecr` section.
      image: my-task

      # (optional) execution role ARN you wish to use for the given task.
      executionRoleArn: arn:aws:iam::123456:role/my-custom-execution-role

      # (optional) task role ARN you wish to use for the given task.
      taskRoleArn: arn:aws:iam::123456:role/my-custom-task-role

      # (optional) the overridden command you wish to execute within the task container.
      command:
        - my-command

      # (optional) the overridden entrypoint you wish to execute within the task container.
      entryPoint:
        - my-entrypoint

      # (optional) memory you wish to allocate to the given task, defaults to the globally supplied memory value.
      # https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#task_size
      memory: '0.5GB'

      # (optional) CPU you wish to allocate to the given task, defaults to the globally supplied CPU value.
      # https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#task_size
      cpu: 256

      # (optional) environment variables which are added to the given task, these are combined with
      # the globally supplied environment variables
      environment:
        name: value

      # (optional) additional tags you wish to apply to the given task, these are combined with
      # the provider and globally supplied tags.
      tags:
        name: value

      # (optional) by default a task is deemed to be a service with a desired count of one,
      # this results in a single long-running process which is a typical use-case of the plugin.
      # however, if you wish to alter this you can include the following configuration options.
      service:
        # (optional) the desired amount of running tasks for the given service.
        desiredCount: 1

        # (optional) used during deployment to determine how many tasks can be provisioned for the transition phase.
        maximumPercent: 200

        # (optional) used during deployment to determine how many tasks are required to remain active for the transition phase.
        minimumHealthyPercent: 100

      # (optional) schedule expression used to configure the task to be executed at a desired time, as opposed to being a service.
      # https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html
      schedule: 'rate(1 minute)'
```

---

Inspired by https://github.com/svdgraaf/serverless-fargate-tasks
