export function normalizeStatus(status) {
  const value = `${status ?? ''}`.trim().toLowerCase();
  const mapping = {
    pendente: 'pendente',
    p: 'pendente',
    'em andamento': 'em_andamento',
    em_andamento: 'em_andamento',
    'em-andamento': 'em_andamento',
    interrompido: 'interrompido',
    interrompida: 'interrompido',
    finalizado: 'finalizado',
    finalizada: 'finalizado',
    concluida: 'finalizado',
    concluída: 'finalizado',
  };

  return mapping[value] || value || 'pendente';
}

export function formatStatusLabel(status) {
  const normalized = normalizeStatus(status);
  const labels = {
    pendente: 'Pendente',
    em_andamento: 'Em andamento',
    interrompido: 'Interrompido',
    finalizado: 'Finalizado',
  };

  return labels[normalized] || 'Pendente';
}

export function getStatusMeta(status) {
  const normalized = normalizeStatus(status);
  const meta = {
    pendente: {
      label: 'Pendente',
      color: '#B7791F',
      backgroundColor: '#FFF4E6',
      icon: 'time-outline',
    },
    em_andamento: {
      label: 'Em andamento',
      color: '#1D4ED8',
      backgroundColor: '#E8F1FF',
      icon: 'play-circle-outline',
    },
    interrompido: {
      label: 'Interrompido',
      color: '#C2410C',
      backgroundColor: '#FFF2E8',
      icon: 'pause-circle-outline',
    },
    finalizado: {
      label: 'Finalizado',
      color: '#15803D',
      backgroundColor: '#E8F8EE',
      icon: 'checkmark-circle-outline',
    },
  };

  return meta[normalized] || meta.pendente;
}
