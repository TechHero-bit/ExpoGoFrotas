import { supabase } from './supabase';

export async function fetchUserProfile(userId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, telefone, role')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function fetchVeiculos() {
  const { data, error } = await supabase
    .from('veiculos')
    .select('id, placa, modelo, status, localizacao, eta')
    .order('modelo', { ascending: true });

  if (error) {
    throw error;
  }
  return data;
}

export async function fetchAvailableVeiculos() {
  const { data, error } = await supabase
    .from('veiculos')
    .select('id, placa, modelo, status, localizacao, eta')
    .eq('status', 'Disponível')
    .order('modelo', { ascending: true });

  if (error) {
    throw error;
  }
  return data;
}

export async function fetchTarefas(usuarioId) {
  const { data, error } = await supabase
    .from('tarefas')
    .select('id, titulo, descricao, status, local, prazo')
    .eq('usuario_id', usuarioId)
    .order('prazo', { ascending: true });

  if (error) {
    throw error;
  }
  return data;
}

export async function fetchDashboardMetrics() {
  const { data, error } = await supabase
    .from('veiculos')
    .select('status');

  if (error) {
    throw error;
  }

  const disponiveis = data.filter((item) => item.status === 'Disponível').length;
  const emRota = data.filter((item) => item.status === 'Em rota').length;
  const manutencao = data.filter((item) => item.status === 'Manutenção').length;

  return {
    total: data.length,
    disponiveis,
    emRota,
    manutencao,
  };
}

export async function fetchActiveJourney(usuarioId) {
  const { data, error } = await supabase
    .from('jornadas')
    .select('id, status, origem, destino, inicio, veiculo_id')
    .eq('usuario_id', usuarioId)
    .eq('status', 'Em andamento')
    .order('inicio', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  return data;
}

export async function fetchJourneyById(jornadaId) {
  const { data, error } = await supabase
    .from('jornadas')
    .select('id, status, origem, destino, inicio, fim, veiculo_id')
    .eq('id', jornadaId)
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function fetchVeiculoById(veiculoId) {
  const { data, error } = await supabase
    .from('veiculos')
    .select('id, placa, modelo, status, localizacao, eta')
    .eq('id', veiculoId)
    .single();

  if (error) {
    throw error;
  }
  return data;
}

export async function createJourneyAndCheckin({ usuarioId, veiculoId, kmInicial, nivelCombustivel, selfieUrl, placaUrl, origem, destino }) {
  const { data: jornada, error: jornadaError } = await supabase
    .from('jornadas')
    .insert([
      {
        usuario_id: usuarioId,
        veiculo_id: veiculoId,
        origem,
        destino,
        status: 'Em andamento',
        inicio: new Date().toISOString(),
      },
    ])
    .select('id')
    .single();

  if (jornadaError) {
    throw jornadaError;
  }

  const { error: checkinError } = await supabase.from('checkins').insert([
    {
      jornada_id: jornada.id,
      usuario_id: usuarioId,
      veiculo_id: veiculoId,
      km_inicial: Number(kmInicial),
      nivel_combustivel: nivelCombustivel,
      selfie_url: selfieUrl,
      placa_url: placaUrl,
    },
  ]);

  if (checkinError) {
    throw checkinError;
  }

  await supabase.from('veiculos').update({ status: 'Em rota' }).eq('id', veiculoId);

  return jornada;
}

export async function finishJourney({ jornadaId, usuarioId, veiculoId, kmFinal, observacoes, selfieUrl, veiculoFotoUrl }) {
  const { error: checkoutError } = await supabase.from('checkouts').insert([
    {
      jornada_id: jornadaId,
      usuario_id: usuarioId,
      veiculo_id: veiculoId,
      km_final: Number(kmFinal),
      observacoes,
      selfie_url: selfieUrl,
      veiculo_foto_url: veiculoFotoUrl,
    },
  ]);

  if (checkoutError) {
    throw checkoutError;
  }

  const { error: jornadaError } = await supabase
    .from('jornadas')
    .update({ status: 'Finalizada', fim: new Date().toISOString() })
    .eq('id', jornadaId);

  if (jornadaError) {
    throw jornadaError;
  }

  await supabase.from('veiculos').update({ status: 'Disponível' }).eq('id', veiculoId);

  return true;
}
