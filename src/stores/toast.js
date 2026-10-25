import { defineStore } from 'pinia'

/** Mensajes flotantes (toasts) que aparecen abajo en la pantalla. */
export const useToastStore = defineStore('toast', {
  state: () => ({
    mensajes: []
  }),
  actions: {
    mostrar(texto, tipo = 'info') {
      const id = Date.now() + Math.random()
      this.mensajes.push({ id, texto, tipo })
      setTimeout(() => this.quitar(id), 4200)
    },
    quitar(id) {
      this.mensajes = this.mensajes.filter((m) => m.id !== id)
    },
    ok(texto) {
      this.mostrar(texto, 'ok')
    },
    error(texto) {
      this.mostrar(texto, 'error')
    }
  }
})
