type FileSystemHandleKind = "file" | "directory";

interface FileSystemHandle {
  readonly kind: FileSystemHandleKind;
  readonly name: string;
}

interface FileSystemFileHandle extends FileSystemHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  values(): AsyncIterable<FileSystemHandle>;
  entries(): AsyncIterable<[string, FileSystemHandle]>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
}

interface Window {
  showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandle>;
}
