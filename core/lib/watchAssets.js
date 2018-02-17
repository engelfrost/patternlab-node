'use strict';

const path = require('path');
const chokidar = require('chokidar');

const logger = require('./log');

let copyFile = require('./copyFile'); // eslint-disable-line prefer-const
const events = require('./events');

function onWatchTripped(
  p,
  assetBase,
  basePath,
  dir,
  copyOptions,
  assetHandler
) {
  const subPath = p.replace(assetBase, '');
  const destination = path.resolve(basePath, dir.public + '/' + subPath);

  if (assetHandler) {
    // The handler can call this when done, and PL can emit events
    const callback = () => {
      copyOptions.emitter.emit(events.PATTERNLAB_PATTERN_ASSET_CHANGE, {
        file: p,
        dest: destination,
      });
    };

    // Not all of these params are necessary, and maybe some are even missing?
    assetHandler(p, destination, copyOptions, basePath, dir, callback);
  } else {
    // Would it make the code prettier if copyFile was wrapped in an "assetHandler" function?
    copyFile(p, destination, copyOptions);
  }
}

const watchAssets = (
  patternlab,
  basePath,
  dir,
  key,
  copyOptions,
  watchOnce,
  assetHandler
) => {
  const assetBase = path.resolve(basePath, dir.source);
  logger.debug(`Pattern Lab is watching ${assetBase} for changes`);

  if (patternlab.watchers[key]) {
    patternlab.watchers[key].close();
  }
  const assetWatcher = chokidar.watch(assetBase, {
    ignored: /(^|[\/\\])\../,
    ignoreInitial: false,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
    persistent: !watchOnce,
  });

  //watch for changes and copy
  assetWatcher
    .on('add', p => {
      onWatchTripped(p, assetBase, basePath, dir, copyOptions, assetHandler);
    })
    .on('change', p => {
      onWatchTripped(p, assetBase, basePath, dir, copyOptions, assetHandler);
    });

  patternlab.watchers[key] = assetWatcher;
};

module.exports = watchAssets;
