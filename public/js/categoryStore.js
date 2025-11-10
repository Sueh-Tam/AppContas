// categoryStore.js
// Persiste e carrega lista de categorias via localStorage e bootstrap de /data/categorias.json

export class CategoryStore {
  constructor() {
    this.STORAGE_KEY = 'appcontas:categorias';
    this._categorias = [];
  }

  async init() {
    const fromStorage = this._readLocal();
    if (fromStorage && Array.isArray(fromStorage)) {
      this._categorias = fromStorage;
      return;
    }
    try {
      const resp = await fetch('./data/categorias.json');
      if (resp.ok) {
        const json = await resp.json();
        if (Array.isArray(json)) {
          this._categorias = json;
          this._writeLocal();
        }
      }
    } catch (err) {
      console.warn('Não foi possível carregar /data/categorias.json:', err);
    }
  }

  getCategorias() {
    return [...this._categorias];
  }

  hasCategoria(nome) {
    const n = String(nome || '').trim();
    if (!n) return false;
    return this._categorias.some((c) => String(c).trim().toLowerCase() === n.toLowerCase());
  }

  addIfNotExists(nome) {
    const n = String(nome || '').trim();
    if (!n) return false;
    if (this.hasCategoria(n)) return false;
    this._categorias.push(n);
    this._writeLocal();
    return true;
  }

  async persist() {
    try {
      this._writeLocal();
    } catch (err) {
      console.error('Erro ao persistir categorias:', err);
      throw err;
    }
  }

  exportToDownload(filename = 'categorias.json') {
    const blob = new Blob([JSON.stringify(this._categorias, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  _readLocal() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error('Erro ao ler categorias do localStorage:', err);
      return null;
    }
  }

  _writeLocal() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._categorias));
  }
}