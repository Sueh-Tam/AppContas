// ui.js
// Renderização de tabela, filtros e feedback visual usando Bootstrap

export class UI {
  constructor() {
    this.tableBody = null;
    this.totalEl = null;
    this.feedbackEl = null;
    document.addEventListener('DOMContentLoaded', () => {
      this.tableBody = document.querySelector('#contasTable tbody');
      this.totalEl = document.getElementById('totalizador');
      this.feedbackEl = document.getElementById('feedback');
    });
  }

  renderTable(contas, filtros = {}) {
    if (!this.tableBody) return;
    const filtered = this.applyFilters(contas, filtros);
    this.tableBody.innerHTML = '';
    for (const c of filtered) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${this.formatDate(c.data)}</td>
        <td>${this.escapeHtml(c.descricao)}</td>
        <td class="d-none d-md-table-cell">${this.escapeHtml(c.local)}</td>
        <td>${this.escapeHtml(c.categoria ?? '')}</td>
        <td class="text-end">${this.formatCurrency(c.valor)}</td>
      `;
      this.tableBody.appendChild(tr);
    }
  }

  updateTotal(contas, filtros = {}) {
    if (!this.totalEl) return;
    const filtered = this.applyFilters(contas, filtros);
    const total = filtered.reduce((sum, c) => sum + Number(c.valor || 0), 0);
    this.totalEl.textContent = `Total: ${this.formatCurrency(total)}`;
  }

  applyFilters(contas, filtros) {
    const { dataDe, dataAte, valorMin, valorMax } = filtros || {};
    return contas.filter((c) => {
      const dataOk = (() => {
        if (!dataDe && !dataAte) return true;
        const d = new Date(c.data);
        if (dataDe && d < new Date(dataDe)) return false;
        if (dataAte && d > new Date(dataAte)) return false;
        return true;
      })();
      const valorOk = (() => {
        const v = Number(c.valor);
        if (valorMin && v < Number(valorMin)) return false;
        if (valorMax && v > Number(valorMax)) return false;
        return true;
      })();
      return dataOk && valorOk;
    });
  }

  showFeedback(message, type = 'info') {
    if (!this.feedbackEl) return;
    this.feedbackEl.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${this.escapeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>`;
  }

  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
  }

  formatDate(iso) {
    // Mostra como yyyy-mm-dd; poderia formatar para dd/mm/yyyy se preferir
    return iso || '';
  }

  escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}