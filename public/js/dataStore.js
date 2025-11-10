// dataStore.js
// Responsável por persistência local (localStorage) e bootstrap com /data/contas.json

export class DataStore {
  constructor() {
    this.STORAGE_KEY = 'appcontas:contas';
    this._contas = [];
  }

  async init() {
    const fromStorage = this._readLocal();
    if (fromStorage && Array.isArray(fromStorage)) {
      this._contas = this._ensureIds(fromStorage);
      return;
    }
    // Bootstrap inicial a partir do arquivo JSON
    try {
      const resp = await fetch('/data/contas.json');
      if (resp.ok) {
        const json = await resp.json();
        if (Array.isArray(json)) {
          this._contas = this._ensureIds(json);
          this._writeLocal();
        }
      }
    } catch (err) {
      // Em ambiente de arquivo (file://) pode falhar; ignorar silenciosamente
      console.warn('Não foi possível carregar /data/contas.json:', err);
    }
  }

  getContas() {
    return [...this._contas];
  }

  addConta(conta) {
    // Validação básica de dados
    if (
      !conta ||
      !conta.data ||
      !conta.descricao ||
      !conta.local ||
      !conta.categoria ||
      !conta.quemPagou ||
      !conta.metodoPagamento ||
      typeof conta.valor !== 'number'
    ) {
      throw new Error('Conta inválida');
    }
    this._contas.push({ id: this._generateId(), ...conta });
  }

  replaceAll(novasContas) {
    if (!Array.isArray(novasContas)) throw new Error('Formato inválido');
    this._contas = this._ensureIds(novasContas.map((c) => ({ ...c })));
  }

  async persist() {
    try {
      this._writeLocal();
    } catch (err) {
      console.error('Erro ao persistir no localStorage:', err);
      throw err;
    }
  }

  exportToDownload(filename = 'contas.json') {
    const blob = new Blob([JSON.stringify(this._contas, null, 2)], { type: 'application/json' });
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
      console.error('Erro ao ler localStorage:', err);
      return null;
    }
  }

  _writeLocal() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._contas));
  }

  removeContaById(id) {
    const before = this._contas.length;
    this._contas = this._contas.filter((c) => c.id !== id);
    if (this._contas.length === before) throw new Error('Conta não encontrada');
  }

  _ensureIds(list) {
    return list.map((c) => ({ id: c.id || this._generateId(), ...c }));
  }

  _generateId() {
    try {
      return crypto.randomUUID();
    } catch (_) {
      return 'id-' + Date.now() + '-' + Math.floor(Math.random() * 1e9);
    }
  }
}