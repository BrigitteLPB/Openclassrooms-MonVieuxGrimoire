/** @type {import("ts-jest").JestConfigWithTsJest} */
import type { JestConfigWithTsJest } from "ts-jest";
import { pathsToModuleNameMapper } from "ts-jest";
import { assign, parse } from "comment-json";
import { readFileSync } from "fs";

type MapLikeImp = { [index: string]: string[] };
const tsconfig = assign(
  {
    compilerOptions: {
      baseUrl: "",
      paths: {} as MapLikeImp,
      outDir: "",
    },
  },
  parse(readFileSync("./tsconfig.json").toString()),
);

const jestConfig: JestConfigWithTsJest = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts?(x)"],
  modulePaths: [tsconfig.compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths),
};

export default jestConfig;
