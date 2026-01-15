export { };

declare global {
    interface Window {
        showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    }

    interface FileSystemHandle {
        kind: 'file' | 'directory';
        name: string;
    }

    interface FileSystemDirectoryHandle extends FileSystemHandle {
        values(): AsyncIterableIterator<FileSystemHandle>;
        getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
        getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
    }

    interface FileSystemFileHandle extends FileSystemHandle {
        getFile(): Promise<File>;
    }
}
