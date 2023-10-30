# OpenClassroms - Projet 7 - Mon vieux grimoire

An express API REST with a MongoDB and a Minio S3 storage.

You can find the OpenApi 3.0 documentation in `/docs/swagger.yaml`.

## Instalation

### databases

run the following command to install the 2 dockers images :

> `docker-compose up -d`

You can install this command line tool via Docker Desktop (https://www.docker.com/products/docker-desktop/)

### Node.JS server

Package instalation can user either `yarn` or `npm`

> `yarn install`

> `npm install`

This project use Typescript, you can generate JS code either with `tsc` command line tool or run `yarn compile`. All files are generated under `build`.

This project support nodemon and ts-node, you can launch the project with the following commands :

> `yarn start` # run with ts-node

> `yarn start-dev` # run with node and js

> `yarn watch-dev` # run with ts-node and nodemon

> `yarn watch` # run with node and nodemon

**Env File**: you can copy the `.env.template` file and rename it `.env`. The template file is already filled with a local setup that works with the original docker-compose

## Tests

You can run tests with :

> `yarn test`
