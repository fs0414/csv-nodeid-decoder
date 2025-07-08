import { parse, stringify } from "https://deno.land/std@0.220.0/csv/mod.ts";
import { basename, dirname, join } from "https://deno.land/std@0.220.0/path/mod.ts";

export interface CsvBase64DecoderOptions {
  filePath: string;
  columnNames: string[];
  encoding?: string;
}

export class CsvBase64Decoder {
  private options: CsvBase64DecoderOptions;

  constructor(options: CsvBase64DecoderOptions) {
    this.options = {
      encoding: "utf-8",
      ...options,
    };
  }

  private decodeBase64ToInt(base64Str: string): number | null {
    try {
      const decoded = atob(base64Str.trim());
      
      const intValue = parseInt(decoded, 10);
      
      if (!isNaN(intValue)) {
        return intValue;
      }
      
      return null;
    } catch (error) {
      console.error(`Base64デコードエラー: ${error}`);
      return null;
    }
  }

  async process(): Promise<void> {
    try {
      const fileInfo = await Deno.stat(this.options.filePath);
      if (!fileInfo.isFile) {
        throw new Error(`指定されたパスはファイルではありません: ${this.options.filePath}`);
      }

      const csvContent = await Deno.readTextFile(this.options.filePath);
      
      const records = parse(csvContent, {
        skipFirstRow: false,
        columns: undefined,
      });

      if (records.length === 0) {
        throw new Error("CSVファイルが空です");
      }

      const headers = records[0] as string[];
      
      const targetColumnIndices: Map<number, string> = new Map();
      this.options.columnNames.forEach(columnName => {
        const index = headers.indexOf(columnName);
        if (index !== -1) {
          targetColumnIndices.set(index, columnName);
        } else {
          console.warn(`カラム "${columnName}" が見つかりません`);
        }
      });

      if (targetColumnIndices.size === 0) {
        throw new Error("指定されたカラムが1つも見つかりません");
      }

      const processedRecords: string[][] = [headers];
      
      for (let i = 1; i < records.length; i++) {
        const row = records[i] as string[];
        const newRow = [...row];
        
        targetColumnIndices.forEach((columnName, index) => {
          if (index < row.length && row[index]) {
            const decodedValue = this.decodeBase64ToInt(row[index]);
            if (decodedValue !== null) {
              newRow[index] = decodedValue.toString();
            } else {
              console.warn(`行 ${i + 1}, カラム "${columnName}" のデコードに失敗しました`);
              // デコード失敗時は元の値を保持
            }
          }
        });
        
        processedRecords.push(newRow);
      }

      const dir = dirname(this.options.filePath);
      const filename = basename(this.options.filePath, ".csv");
      const outputPath = join(dir, `${filename}_opts.csv`);

      const outputContent = stringify(processedRecords);
      await Deno.writeTextFile(outputPath, outputContent);

      console.log(`処理完了: ${outputPath}`);
      console.log(`処理したカラム: ${Array.from(targetColumnIndices.values()).join(", ")}`);
      console.log(`処理した行数: ${processedRecords.length - 1}`);
      
    } catch (error) {
      throw new Error(`CSV処理エラー: ${error}`);
    }
  }
}

export async function decodeBase64Csv(
  filePath: string,
  columnNames: string[]
): Promise<void> {
  const decoder = new CsvBase64Decoder({
    filePath,
    columnNames,
  });
  
  await decoder.process();
}

if (import.meta.main) {
  const args = Deno.args;
  
  if (args.length < 2) {
    console.error("使用方法: deno run --allow-read --allow-write csv-base64-decoder.ts <CSVファイルパス> <カラム名1> [カラム名2] ...");
    Deno.exit(1);
  }
  
  const filePath = args[0];
  const columnNames = args.slice(1);
  
  try {
    await decodeBase64Csv(filePath, columnNames);
  } catch (error) {
    console.error(`エラー: ${error}`);
    Deno.exit(1);
  }
}
