## [1.9.0](https://github.com/travel-albums-ai/albums-google-photos-indexer/compare/v1.8.0...v1.9.0) (2026-08-14)

### Features

* add health check endpoint and improve metadata file handling ([a29686d](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/a29686d6e9d7750c28af1c85df2d193ea99d9890))

## [1.8.0](https://github.com/travel-albums-ai/albums-google-photos-indexer/compare/v1.7.0...v1.8.0) (2026-08-14)

### Features

* update context menu items and server configuration for improved clarity ([af784f5](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/af784f59ea184924ff617b99829c20de6108b977))

## [1.7.0](https://github.com/travel-albums-ai/albums-google-photos-indexer/compare/v1.6.0...v1.7.0) (2026-08-14)

### Features

* enhance server management with status updates and context menu actions ([ed739f5](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/ed739f58f6db7d3c430dbcea2af36734b8e08f85))

## [1.6.0](https://github.com/travel-albums-ai/albums-google-photos-indexer/compare/v1.5.0...v1.6.0) (2026-08-14)

### Features

* add PowerShell launcher script for server management ([bf06b99](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/bf06b99bf1545f3f9cd4dd00f71ca17565f3bdb3))

## [1.5.0](https://github.com/travel-albums-ai/albums-google-photos-indexer/compare/v1.4.0...v1.5.0) (2026-08-14)

### Features

* add Windows distribution build step and update release assets ([c3008f0](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/c3008f0ffad69e8b72e247890773308562291f54))

## [1.4.0](https://github.com/travel-albums-ai/albums-google-photos-indexer/compare/v1.3.0...v1.4.0) (2026-08-14)

### Features

* add zip archive creation for Windows builds and update README ([d4d478c](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/d4d478c28eda67aeb9c8f0b8d7e8983623ffbe38))

## [1.3.0](https://github.com/travel-albums-ai/albums-google-photos-indexer/compare/v1.2.0...v1.3.0) (2026-08-14)

### Features

* update packaging for Windows distributions and add launcher scripts ([b23f647](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/b23f6476dc60f444c37ffe099602dd41ff903eb5))

## [1.2.0](https://github.com/travel-albums-ai/albums-google-photos-indexer/compare/v1.1.0...v1.2.0) (2026-08-14)

### Features

* add Bun support for Windows executables and update package scripts ([fc42a59](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/fc42a59d315c96dea9c2c8197350a338b393e4bc))

## [1.1.0](https://github.com/travel-albums-ai/albums-google-photos-indexer/compare/v1.0.0...v1.1.0) (2026-08-14)

### Features

* add server functionality with express and indexer control endpoints ([643aedc](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/643aedcc9771c8dec8ab9e36d2db4f4cd8074dac))

## 1.0.0 (2026-08-09)

### Features

* add GitHub Actions workflow for semantic release and configuration file ([8b2afc9](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/8b2afc93ff713d61ad90bd022a39cd512e4e7f3d))
* add indexer CLI for processing images and generating output files ([65e436b](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/65e436b3227289cef3a4242c251f940a5343960e))
* add metadata.json to .gitignore for test output exclusion ([5257231](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/52572312d468dbabc72f6e71e217b68a78a80db0))
* add programmatic usage example to README and refactor start function for improved control ([6b9e26e](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/6b9e26e35e0dc50a856a2716b072a144a7c78fa8))
* add README with project overview, usage examples, and configuration details ([057fb8c](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/057fb8c4d83f334edc7e3e82060c28b3b70f9010))
* enhance thumbnail creation with relative path handling and root index support ([dff384e](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/dff384e1205394d018ac86dba7c586cb37b20b87))
* fix folder path extraction in walkStream function for accurate ID generation ([1e6b357](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/1e6b3573490e31f498ed2512d8e461ba6016466f))
* implement abort signal handling in walkStream and start functions for improved control ([d2ffd0c](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/d2ffd0c030798df83bcf97b522b04ec5a43b5c50))
* import EventEmitter from 'node:events' for event handling in indexer-cli ([bce0c34](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/bce0c34aab8c87070a6aa8a66d053eb3994e6a1e))
* initialize albums-google-photos-indexer project with indexing pipeline ([8649213](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/864921331424653ea9739e5a96d54e498bef3b25))
* optimize root index handling in JSON conversion and worker function ([a50c2dc](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/a50c2dc46d2638b6e3babbf1313c6212b5ccadb7))
* pass base64 encoded root path to thumbnail creation for improved path handling ([4db8b83](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/4db8b835d5077489df10061a8f01c26f0348a705))
* refactor indexer to use IndexerController for improved control and add programmatic usage examples ([e732fc8](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/e732fc8c91889684c3a9af4bcececc1d16d0df83))
* refactor indexer with modular functions and improved progress tracking ([8add784](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/8add78438cbe69a47111d41eac8ce5cc03b36870))
* simplify return structure in JSON conversion and update TAKEOUT_ROOTS in config ([596cc19](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/596cc19824141e503a4ad4e0a6feefa104286949))
* support multiple TAKEOUT_ROOTS in configuration and update CLI to handle them ([843298b](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/843298b45ef4e9f1cefc039cb1adf4bf92f8d669))
* update ID generation to include root path for better uniqueness ([8de2c11](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/8de2c11e4c29d5b5b74be6ad531b7a7a02dabfc0))
* update package.json and package-lock.json for version 0.0.2, add build script, and include esbuild as a devDependency ([d436801](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/d436801c935ada07ba663da8212723a56c907c80))
* update package.json to include additional files and metadata ([7b91691](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/7b916912db5127886158fd39d01c4cedb3de57fd))
* update record structure to include relative path and root index in JSON conversion ([eb13127](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/eb13127e4f553f1ac57b2e1d35bfa276fa7e4db4))
* update version to 0.0.3 and add bundledDependencies for sharp ([838a5df](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/838a5df9085e04314d60e4784e83533bab2e5a53))

### Bug Fixes

* correct flowchart labels in README for clarity ([9b1fcf4](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/9b1fcf43adec4300b860da79ecee8b0339f92e13))
* enhance output logging and improve async handling in thumbnail creation ([65a01da](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/65a01da8001502b903616641f9f93250df4a6e27))
* import CACHE_FOLDER in createOrReadThumbnail and update getSizesAndCreatePreview for consistency ([f428a2f](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/f428a2fd334e67b3753c022076058555bfadecc1))
* improve JSON file handling and image existence check in walkStream function ([b001796](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/b0017960b97c8d69e5368a3d5aa901621cb08ea0))
* refactor thumbnail handling and improve concurrency management in worker and queue ([9fd6a7c](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/9fd6a7cfc8dbff69888ed292ac7766ea3f45f4ef))
* remove duplicate import of CACHE_FOLDER and OUT_FILE in indexer-cli ([45be518](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/45be5180eee57936ff95654022e15b3f3b6d5869))
* remove duplicate import of createSemaphore in indexer.mjs ([f0c1915](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/f0c1915a6141e0f9b642b18043730470eedf48f4))
* update flowchart in README to clarify semaphore usage and worker concurrency ([912541c](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/912541c930dbf69e75960a38fbfe40fc04924c89))
* update image format validation in walkStream function and remove unused JSON_PATH from config ([3838e70](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/3838e707e1ec834be7d47ff1ea917876483ea660))
* update SEPARATOR constant and adjust related functions for consistency ([351fd99](https://github.com/travel-albums-ai/albums-google-photos-indexer/commit/351fd99e579f1be4b773aa06dcfb5c54cf1e9743))
