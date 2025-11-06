// src/utils/slots.js
import { botConfig } from '../config/settings.js';

/**
 * Gera os horários (strings 'HH:MM') começando em appointmentStartHour
 * pulando appointmentSlotMinutes até o appointmentEndHour.
 */
export function generateDailySlots() {
  const slots = [];
  const slotMin = botConfig.appointmentSlotMinutes; // 90
  const start = botConfig.appointmentStartHour * 60; // em minutos
  const end = botConfig.appointmentEndHour * 60; // em minutos

  for (let m = start; m <= end; m += slotMin) {
    const hh = Math.floor(m / 60).toString().padStart(2, '0');
    const mm = (m % 60).toString().padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

/**
 * Gera as próximas N datas (YYYY-MM-DD) que caem de Segunda(1) a Sábado(6).
 */
export function generateAvailableDates(daysAhead = botConfig.appointmentDaysAhead) {
  const dates = [];
  const today = new Date();
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const weekday = d.getDay(); // 0 = domingo, 1 = segunda, ...
    if (weekday === 0) continue; // pular domingo
    // Formatar YYYY-MM-DD
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

/**
 * Converte 'YYYY-MM-DD' -> 'DD/MM/YYYY' para exibição
 */
export function formatDateDisplay(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
