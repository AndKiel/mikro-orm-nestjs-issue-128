```shell
docker-compose up -d
yarn install

# reproduction.ts
yarn build
yarn run:ts-node
yarn run:built

# reproduction-alt.ts
yarn run:ts-node:alt

docker-compose stop
```
