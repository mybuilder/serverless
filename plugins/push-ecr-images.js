'use strict';

const get = (obj, path, def) =>
  path
    .split('.')
    .filter(Boolean)
    .every(step => !(step && (obj = obj[step]) === undefined))
    ? obj
    : def;

class PushEcrImagesPlugin {
  constructor(serverless) {
    this.serverless = serverless;

    this.commands = {
      'ecr:push-images': {
        lifecycleEvents: ['invoke'],
        usage: 'Build and push all present images to ECR',
      },
    };

    this.hooks = {
      'ecr:push-images:invoke': this.invoke.bind(this),
    };
  }

  async invoke() {
    const imageNames = Object.keys(
      get(this.serverless, 'service.provider.ecr.images', {})
    );

    if (imageNames.length === 0) {
      return;
    }

    const { PUSHED_IMAGE_URIS_JSON_PATH: jsonPath } = process.env;

    if (jsonPath === undefined) {
      throw new Error(
        'Cannot push images without a PUSHED_IMAGE_URIS_JSON_PATH env var'
      );
    }

    const images = await this.pushImages(imageNames);

    require('fs').writeFileSync(jsonPath, JSON.stringify(images));
  }

  // Uses the frameworks internal means of building images
  async pushImages(imageNames) {
    const images = {};

    for (const name of imageNames) {
      const tempFunctionName = name + '-build';

      this.serverless.service.functions[tempFunctionName] = {
        image: name,
      };

      const { functionImageUri } = await this.serverless
        .getProvider('aws')
        .resolveImageUriAndSha(tempFunctionName);

      images[name] = functionImageUri;

      delete this.serverless.service.functions[tempFunctionName];
    }

    return images;
  }
}

module.exports = PushEcrImagesPlugin;
