import "reflect-metadata";

import { BaseEntity, Entity, PrimaryKey, SerializedPrimaryKey } from "@mikro-orm/core";
import { EntityManager, ObjectId } from "@mikro-orm/mongodb";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { INestApplicationContext, Injectable, Module, Scope } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { LoggerModule, PinoLogger } from "nestjs-pino";

@Entity({ collection: "entities" })
export class MongoEntity extends BaseEntity<MongoEntity, "id"> {
  @PrimaryKey()
  public _id!: ObjectId;

  @SerializedPrimaryKey()
  public id!: string;
}


@Injectable({ scope: Scope.TRANSIENT })
export class MongoService {
  private entityManager: EntityManager;

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager.fork();
  }
}

@Module({ providers: [MongoService] })
export class MongoModule {}

@Module({
  imports: [
    LoggerModule.forRoot(),
    MikroOrmModule.forRootAsync({
      inject: [PinoLogger],
      useFactory: (logger: PinoLogger) => {
        logger.setContext("MikroOrm");

        return {
          type: "mongo",
          clientUrl: "mongodb://127.0.0.1:27017/dbName", // run a local dockerized MongoDB v3 instance
          dbName: "dbName",
          entities: [MongoEntity],
          debug: ["query"], // Log all queries
          logger: message => logger.info(message),
        };
      },
    }),
    MongoModule,
  ],
})
class AppModule {}

let applicationContext: INestApplicationContext;

if (require.main === module) {
  (async () => {
    applicationContext = await NestFactory.createApplicationContext(AppModule);
    applicationContext = await applicationContext.init();
    await applicationContext.resolve(MongoService);
    await applicationContext.close();
    process.exit(0)
  })().catch(async error => {
    await applicationContext?.close();
    throw error;
  });
}
