// validation.js
// Validação de formulário no cliente, integrada com Bootstrap 5

export class Validation {
  enableBootstrapValidation(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    // Bootstrap pattern: impedindo submit se inválido e adicionando classe
    form.addEventListener('submit', (event) => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    }, { capture: true });
  }

  validateForm(form) {
    // Regras adicionais além de required
    const valorEl = form.querySelector('#valor');
    const valor = Number(valorEl?.value || 0);
    const descricao = form.querySelector('#descricao')?.value?.trim();
    const local = form.querySelector('#local')?.value?.trim();
    const data = form.querySelector('#data')?.value;
    const categoria = form.querySelector('#categoria')?.value;
    const categoriaOutros = form.querySelector('#categoriaOutros')?.value?.trim();

    const categoriaValida = categoria === 'Outros' ? Boolean(categoriaOutros) : Boolean(categoria);
    const ok = Boolean(data) && Boolean(descricao) && Boolean(local) && categoriaValida && Number.isFinite(valor) && valor >= 0;
    return ok;
  }
}