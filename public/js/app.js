// app.js
// Ponto de entrada do aplicativo. Importa módulos e inicializa eventos da UI.

import { DataStore } from './dataStore.js';
import { UI } from './ui.js';
import { Validation } from './validation.js';
import { FileSync } from './fileSync.js';

// Instâncias dos módulos
const store = new DataStore();
const ui = new UI();
const validation = new Validation();
const fileSync = new FileSync(store);

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

    // Renderização inicial
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
  } catch (err) {
    console.error('Falha ao iniciar app:', err);
  }
}

// Inicializa quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);