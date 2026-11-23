import { describe, expect, it } from "vitest";
import { collectEntries, sortFiles } from "../../src/core/droppedFiles";
import type { DropEntry } from "../../src/core/droppedFiles";

const file = (name: string) => new File(["가상"], name);

function fileEntry(name: string): DropEntry {
  return { isFile: true, isDirectory: false, name, file: (done: (file: File) => void) => done(file(name)) } as DropEntry;
}

/** readEntries를 여러 번 나눠 주는 폴더. 실제 Chrome은 100개씩 줍니다. */
function folderEntry(name: string, children: DropEntry[], perRead = 2): DropEntry {
  return {
    isFile: false,
    isDirectory: true,
    name,
    createReader: () => {
      let offset = 0;
      return {
        readEntries: (done: (entries: DropEntry[]) => void) => {
          done(children.slice(offset, offset + perRead));
          offset += perRead;
        },
      };
    },
  } as DropEntry;
}

const names = (files: File[]) => files.map((item) => item.name);

describe("collectEntries", () => {
  it("폴더 안의 엑셀만 고르고 하위 폴더도 읽으며 나머지는 센다", async () => {
    const result = await collectEntries(
      [
        folderEntry("2학년", [
          fileEntry("2학년 10반.xlsx"),
          fileEntry("2학년 2반.xls"),
          fileEntry("안내.hwp"),
          fileEntry("~$2학년 2반.xls"),
          fileEntry(".DS_Store"),
          folderEntry("추가", [fileEntry("2학년 1반.XLSX"), fileEntry("메모.txt")]),
        ]),
      ],
      []
    );
    expect(names(result.files)).toEqual(["2학년 1반.XLSX", "2학년 2반.xls", "2학년 10반.xlsx"]);
    expect(result.skippedInFolders).toBe(2);
  });

  it("따로 놓은 파일은 형식과 상관없이 둔다", async () => {
    const result = await collectEntries([fileEntry("점수.csv"), fileEntry("1반.xlsx")], []);
    expect(names(result.files)).toEqual(["1반.xlsx", "점수.csv"]);
    expect(result.skippedInFolders).toBe(0);
  });

  it("항목 정보가 없으면 받은 파일을 그대로 쓴다", async () => {
    const result = await collectEntries([null], [file("2반.xlsx"), file("~$2반.xlsx"), file("1반.xlsx")]);
    expect(names(result.files)).toEqual(["1반.xlsx", "2반.xlsx"]);
  });
});

describe("sortFiles", () => {
  it("숫자를 숫자로 비교한다", () => {
    expect(names(sortFiles([file("10반.xlsx"), file("9반.xlsx"), file("1반.xlsx")]))).toEqual([
      "1반.xlsx",
      "9반.xlsx",
      "10반.xlsx",
    ]);
  });
});
