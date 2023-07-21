import "reflect-metadata";

import { BaseEntity, Entity, PrimaryKey, SerializedPrimaryKey } from "@mikro-orm/core";
import { EntityRepository, ObjectId } from "@mikro-orm/mongodb";
import { InjectRepository, MikroOrmModule } from "@mikro-orm/nestjs";
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

@Injectable()
export class MongoService {
  constructor(@InjectRepository(MongoEntity) public readonly repository: EntityRepository<MongoEntity>) {}
}

@Module({ imports: [MikroOrmModule.forFeature([MongoEntity])], providers: [MongoService] })
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
          clientUrl: "mongodb://127.0.0.1:27017/dbName", // local dockerized MongoDB v3 instance
          dbName: "dbName",
          entities: [MongoEntity],
          debug: ["query"], // Log all queries
          logger: message => logger.info(message),
        };
      },
      // If scope is not passed, using repository throws ValidationError
      scope: Scope.REQUEST,
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
    // If scope is passed to MikroOrmModule.forRootAsync, applicationContext.get works but repository is undefined
    // .resolve must be used instead
    const mongoService = await applicationContext.resolve(MongoService);
    await mongoService.repository.findAll(); // With scope it works

    // With scope each resolved new MongoService instance gets EntityManager with _id incremented by 1
    console.info("EntityManager _id is %d", (await applicationContext.resolve(MongoService)).repository.getEntityManager()._id)
    console.info("EntityManager _id is %d", (await applicationContext.resolve(MongoService)).repository.getEntityManager()._id)

    await applicationContext.close();
    process.exit(0)
  })().catch(async error => {
    await applicationContext?.close();
    throw error;
  });
}
