// app.js
// Ponto de entrada do aplicativo. Importa módulos e inicializa eventos da UI.

import { DataStore } from './dataStore.js';
import { UI } from './ui.js';
import { Validation } from './validation.js';
import { FileSync } from './fileSync.js';
import { CategoryStore } from './categoryStore.js';

// Instâncias dos módulos
const store = new DataStore();
const ui = new UI();
const validation = new Validation();
const fileSync = new FileSync(store);
const catStore = new CategoryStore();

// Estado de filtros
const filtros = {
  dataDe: null,
  dataAte: null,
  valorMin: null,
  valorMax: null,
  quemPagou: null,
  metodoPagamento: null,
};

async function init() {
  try {
    // Inicializa validação Bootstrap
    validation.enableBootstrapValidation('contaForm');

    // Carrega dados do localStorage ou do arquivo inicial
    await store.init();
    await catStore.init();

    // Popular categorias dinamicamente e renderização inicial
    populateCategoriaSelect();
    ui.renderTable(store.getContas(), filtros);
    ui.updateTotal(store.getContas(), filtros);

    // Eventos de formulário
    const form = document.getElementById('contaForm');
    // Alterna campo de categoria personalizada
    const categoriaSelect = document.getElementById('categoria');
    const outrosWrapper = document.getElementById('categoriaOutrosWrapper');
    const outrosInput = document.getElementById('categoriaOutros');
    const toggleOutros = () => {
      const isOutros = categoriaSelect.value === 'Outros';
      outrosWrapper.classList.toggle('d-none', !isOutros);
      outrosInput.required = isOutros;
    };
    categoriaSelect.addEventListener('change', toggleOutros);
    toggleOutros();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      // Validação de frontend
      const valid = validation.validateForm(form);
      if (!valid) {
        ui.showFeedback('Preencha os campos corretamente.', 'danger');
        return;
      }

      const novaConta = {
        data: document.getElementById('data').value,
        descricao: document.getElementById('descricao').value.trim(),
        local: document.getElementById('local').value.trim(),
        categoria: (document.getElementById('categoria').value === 'Outros'
          ? document.getElementById('categoriaOutros').value.trim()
          : document.getElementById('categoria').value),
        quemPagou: document.getElementById('quemPagou').value,
        metodoPagamento: document.getElementById('metodoPagamento').value,
        valor: Number(document.getElementById('valor').value),
      };

      try {
        // Se for categoria personalizada, salvar no store de categorias caso não exista
        const categoriaSelect = document.getElementById('categoria');
        const outrosInput = document.getElementById('categoriaOutros');
        if (categoriaSelect.value === 'Outros') {
          const novaCat = outrosInput.value.trim();
          if (novaCat) {
            const added = catStore.addIfNotExists(novaCat);
            if (added) {
              populateCategoriaSelect();
            }
          }
        }

        store.addConta(novaConta);
        await store.persist();
        ui.renderTable(store.getContas(), filtros);
        ui.updateTotal(store.getContas(), filtros);
        form.reset();
        form.classList.remove('was-validated');
        // Reaplicar estado do campo "Outros"
        toggleOutros();
        ui.showFeedback('Conta salva com sucesso!', 'success');

        // Sincronização opcional com arquivo
        fileSync.autoSync();
      } catch (err) {
        console.error(err);
        ui.showFeedback('Erro ao salvar. Tente novamente.', 'danger');
      }
    });

    // Eventos de filtros
    const bindFiltro = (id, key, eventName = 'input') => {
      const el = document.getElementById(id);
      el.addEventListener(eventName, () => {
        filtros[key] = el.value || null;
        ui.renderTable(store.getContas(), filtros);
        ui.updateTotal(store.getContas(), filtros);
      });
    };

    bindFiltro('filtroDataDe', 'dataDe');
    bindFiltro('filtroDataAte', 'dataAte');
    bindFiltro('filtroValorMin', 'valorMin');
    bindFiltro('filtroValorMax', 'valorMax');
    bindFiltro('filtroQuemPagou', 'quemPagou', 'change');
    bindFiltro('filtroMetodoPagamento', 'metodoPagamento', 'change');

    // Importar/Exportar JSON
    const importInput = document.getElementById('importJson');
    importInput.addEventListener('change', async (e) => {
      try {
        const file = e.target.files?.[0];
        if (!file) return;
        const text = await file.text();
        const contas = JSON.parse(text);
        store.replaceAll(contas);
        await store.persist();
        ui.renderTable(store.getContas(), filtros);
        ui.updateTotal(store.getContas(), filtros);
        ui.showFeedback('Importação concluída.', 'success');
      } catch (err) {
        console.error(err);
        ui.showFeedback('Arquivo inválido.', 'danger');
      } finally {
        importInput.value = '';
      }
    });

    document.getElementById('exportJson').addEventListener('click', () => {
      try {
        store.exportToDownload('contas.json');
        ui.showFeedback('Exportação gerada com sucesso.', 'success');
      } catch (err) {
        console.error(err);
        ui.showFeedback('Erro ao exportar.', 'danger');
      }
    });

    document.getElementById('exportCategorias').addEventListener('click', () => {
      try {
        catStore.exportToDownload('categorias.json');
        ui.showFeedback('Exportação de categorias gerada com sucesso.', 'success');
      } catch (err) {
        console.error(err);
        ui.showFeedback('Erro ao exportar categorias.', 'danger');
      }
    });

    // Exportar PDF das contas (considerando filtros)
    document.getElementById('exportPdf').addEventListener('click', () => {
      try {
        const contasFiltradas = ui.applyFilters(store.getContas(), filtros);
        const { jsPDF } = window.jspdf || {};
        if (!jsPDF || !window.jspdf) throw new Error('jsPDF não carregado');
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        doc.setFontSize(12);
        doc.text('Relatório de Contas', 40, 40);
        doc.setFontSize(9);

        const headers = [['Data', 'Descrição', 'Local', 'Categoria', 'Quem pagou', 'Método', 'Valor']];
        const body = contasFiltradas.map((c) => [
          ui.formatDate(c.data),
          String(c.descricao || ''),
          String(c.local || ''),
          String(c.categoria || ''),
          String(c.quemPagou || ''),
          String(c.metodoPagamento || ''),
          ui.formatCurrency(c.valor),
        ]);

        if (typeof doc.autoTable !== 'function') throw new Error('AutoTable não carregado');
        doc.autoTable({
          head: headers,
          body,
          startY: 60,
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [48, 63, 159], textColor: 255 },
          columnStyles: { 6: { halign: 'right' } },
        });
        const finalY = doc.lastAutoTable?.finalY || 60;
        const total = contasFiltradas.reduce((sum, c) => sum + Number(c.valor || 0), 0);
        doc.setFontSize(10);
        doc.text(`Total: ${ui.formatCurrency(total)}`, 40, finalY + 20);
        doc.save('contas.pdf');
        ui.showFeedback('PDF gerado com sucesso.', 'success');
      } catch (err) {
        console.error(err);
        ui.showFeedback('Erro ao gerar PDF.', 'danger');
      }
    });

    // Sincronização via File System Access API (opcional)
    const syncBtn = document.getElementById('syncFile');
    syncBtn.addEventListener('click', async () => {
      try {
        const ok = await fileSync.connect();
        if (ok) {
          await fileSync.write();
          ui.showFeedback('Sincronização ativada e arquivo atualizado.', 'success');
        } else {
          ui.showFeedback('Navegador não suporta File System Access API.', 'warning');
        }
      } catch (err) {
        console.error(err);
        ui.showFeedback('Falha na sincronização com arquivo.', 'danger');
      }
    });

    // Delegação de clique para remover conta
    const tableBody = document.querySelector('#contasTable tbody');
    tableBody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action="delete"]');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (!id) return;
      try {
        store.removeContaById(id);
        await store.persist();
        ui.renderTable(store.getContas(), filtros);
        ui.updateTotal(store.getContas(), filtros);
        ui.showFeedback('Conta removida com sucesso.', 'success');
      } catch (err) {
        console.error(err);
        ui.showFeedback('Erro ao remover conta.', 'danger');
      }
    });
  } catch (err) {
    console.error('Falha ao iniciar app:', err);
  }
}

// Inicializa quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);

// Utilitário para popular o select de categorias dinamicamente
function populateCategoriaSelect() {
  const select = document.getElementById('categoria');
  if (!select) return;
  const current = select.value ?? '';
  // Limpa e recria opções: “Selecione…”, categorias do store, “Outros”
  select.innerHTML = '';
  const optDefault = document.createElement('option');
  optDefault.value = '';
  optDefault.textContent = 'Selecione...';
  select.appendChild(optDefault);

  for (const cat of catStore.getCategorias()) {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  }

  const optOutros = document.createElement('option');
  optOutros.value = 'Outros';
  optOutros.textContent = 'Outros';
  select.appendChild(optOutros);

  // Restaura seleção se possível
  const values = [ ...catStore.getCategorias(), 'Outros' ];
  if (values.includes(current)) {
    select.value = current;
  } else {
    select.value = '';
  }
}