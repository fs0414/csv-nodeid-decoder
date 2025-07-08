import { CsvBase64Decoder, decodeBase64Csv } from "./main.ts";

// 方法1: クラスを使用
const decoder = new CsvBase64Decoder({
  filePath: "./test.csv",
  columnNames: ["encoded_id", "encoded_value"],
});
await decoder.process();

// 方法2: 関数を使用
// await decodeBase64Csv("./data.csv", ["encoded_id", "encoded_value"]);
