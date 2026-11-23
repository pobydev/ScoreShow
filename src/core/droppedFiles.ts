/**
 * 끌어다 놓은 파일과 폴더를 파일 목록으로 풉니다.
 * 폴더 안에서는 엑셀 파일만 고르고(하위 폴더 포함), 따로 놓은 파일은 형식과 상관없이 그대로 둡니다.
 * 받지 않는 형식은 저장 창이 이유와 함께 보여 줍니다.
 */

/** 브라우저의 FileSystemEntry 가운데 여기서 쓰는 부분 */
export interface DropEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
}

interface DropFileEntry extends DropEntry {
  file: (success: (file: File) => void, failure?: (error: unknown) => void) => void;
}

interface DropDirectoryEntry extends DropEntry {
  createReader: () => {
    readEntries: (success: (entries: DropEntry[]) => void, failure?: (error: unknown) => void) => void;
  };
}

export interface CollectedFiles {
  files: File[];
  /** 폴더 안에 있었지만 엑셀이 아니어서 뺀 파일 수 */
  skippedInFolders: number;
}

const EXCEL_NAME = /\.(xlsx|xls)$/i;

/** 엑셀이 열어 둔 파일 옆에 만드는 "~$" 임시 파일과 숨김 파일은 아예 보지 않습니다. */
function isHiddenOrTemporary(name: string) {
  return name.startsWith("~$") || name.startsWith(".");
}

const byName = new Intl.Collator("ko", { numeric: true }).compare;

/** "2학년 1반", "2학년 2반", "2학년 10반" 순서가 되도록 숫자를 숫자로 비교합니다. */
export function sortFiles(files: File[]): File[] {
  return [...files].sort((a, b) => byName(a.name, b.name));
}

function readFile(entry: DropFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

/** 한 번에 100개까지만 주므로 빈 배열이 올 때까지 읽습니다. */
async function readDirectory(entry: DropDirectoryEntry): Promise<DropEntry[]> {
  const reader = entry.createReader();
  const all: DropEntry[] = [];
  for (;;) {
    const batch = await new Promise<DropEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
    if (batch.length === 0) return all;
    all.push(...batch);
  }
}

async function collectFolder(entry: DropDirectoryEntry, result: CollectedFiles) {
  for (const child of await readDirectory(entry)) {
    if (isHiddenOrTemporary(child.name)) continue;
    if (child.isDirectory) {
      await collectFolder(child as DropDirectoryEntry, result);
    } else if (child.isFile) {
      if (EXCEL_NAME.test(child.name)) {
        result.files.push(await readFile(child as DropFileEntry));
      } else {
        result.skippedInFolders++;
      }
    }
  }
}

/** 놓은 항목을 풉니다. 항목 정보가 없는 브라우저면 fallback 파일을 그대로 씁니다. */
export async function collectEntries(
  entries: (DropEntry | null)[],
  fallback: File[]
): Promise<CollectedFiles> {
  const result: CollectedFiles = { files: [], skippedInFolders: 0 };
  if (entries.length === 0 || entries.some((entry) => entry === null)) {
    result.files = fallback.filter((file) => !isHiddenOrTemporary(file.name));
  } else {
    for (const entry of entries as DropEntry[]) {
      if (isHiddenOrTemporary(entry.name)) continue;
      if (entry.isDirectory) {
        await collectFolder(entry as DropDirectoryEntry, result);
      } else if (entry.isFile) {
        result.files.push(await readFile(entry as DropFileEntry));
      }
    }
  }
  result.files = sortFiles(result.files);
  return result;
}

/**
 * 놓기 이벤트의 파일과 폴더를 모읍니다.
 * 항목은 이벤트가 끝나면 읽을 수 없으므로, 이 함수는 놓기 처리기 안에서 바로 불러야 합니다.
 */
export function collectDroppedFiles(dataTransfer: DataTransfer): Promise<CollectedFiles> {
  const items = Array.from(dataTransfer.items ?? []).filter((item) => item.kind === "file");
  const entries = items.map((item) =>
    typeof item.webkitGetAsEntry === "function" ? (item.webkitGetAsEntry() as DropEntry | null) : null
  );
  return collectEntries(entries, Array.from(dataTransfer.files));
}
