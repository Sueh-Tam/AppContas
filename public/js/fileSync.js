// fileSync.js
// Sincronização opcional com um arquivo JSON usando File System Access API (Chrome/Edge)

export class FileSync {
  constructor(store) {
    this.store = store;
    this.fileHandle = null;
  }

  isSupported() {
    return 'showSaveFilePicker' in window || 'showOpenFilePicker' in window;
  }

  async connect() {
    if (!this.isSupported()) return false;
    try {
      // Permite escolher arquivo existente ou criar novo
      const picker = await window.showSaveFilePicker({
        suggestedName: 'contas.json',
        types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
      });
      this.fileHandle = picker;
      return true;
    } catch (err) {
      if (err && err.name === 'AbortError') return false;
      console.error('Erro ao conectar ao arquivo:', err);
      throw err;
    }
  }

  async write() {
    if (!this.fileHandle) return false;
    try {
      const writable = await this.fileHandle.createWritable();
      await writable.write(new Blob([JSON.stringify(this.store.getContas(), null, 2)], { type: 'application/json' }));
      await writable.close();
      return true;
    } catch (err) {
      console.error('Erro ao escrever no arquivo:', err);
      throw err;
    }
  }

  async autoSync() {
    try {
      if (!this.fileHandle) return false;
      return await this.write();
    } catch (err) {
      console.error('AutoSync falhou:', err);
      return false;
    }
  }
}