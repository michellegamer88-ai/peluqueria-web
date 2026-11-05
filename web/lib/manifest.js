/* Datos de la marca (demo). El salón cambia aquí sus precios y planes:
   la calculadora del estudio los usa directamente. */
(function () {
  "use strict";
  window.__BRAND__ = {
    name: "AURUM Atelier",
    phone: "+34 600 000 000",
    email: "hola@aurum-atelier.es",
    // Precio suelto orientativo de cada tratamiento (€ por sesión)
    tratamientos: {
      hidratacion:    { nombre: "Hidratación profunda",          precio: 30,  porMes: 1 },
      reconstruccion: { nombre: "Reconstrucción de enlaces",     precio: 45,  porMes: 2 },
      keratina:       { nombre: "Alisado de keratina",           precio: 150, porMes: 0.25 },
      anticaida:      { nombre: "Ritual de cuero cabelludo",     precio: 38,  porMes: 1 },
      color:          { nombre: "Color + gloss de mantenimiento", precio: 48, porMes: 1 },
      mantenimiento:  { nombre: "Mantenimiento con gloss",       precio: 25,  porMes: 0 }
    },
    // Club AURUM: cuota mensual, tratamientos incluidos y descuento en producto
    planes: {
      esencial:       { nombre: "Esencial",       cuota: 39, incluye: 0, dto: 0.10, texto: "1 corte o barba al mes + 10 % en productos" },
      ritual:         { nombre: "Ritual",         cuota: 59, incluye: 1, dto: 0.15, texto: "1 servicio + 1 tratamiento al mes + 15 % en productos" },
      reconstruccion: { nombre: "Reconstrucción", cuota: 89, incluye: 2, dto: 0.20, texto: "1 servicio + 2 tratamientos al mes + 20 % en productos" }
    }
  };
})();
