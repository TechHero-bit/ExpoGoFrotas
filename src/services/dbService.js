import { supabase } from './supabase';

export async function fetchUserProfile(userId) {
  const { data, error, status } = await supabase
    .from('usuarios')
    .select('id, nome, email, telefone, role')
    .eq('id', userId);

  console.log('[DEBUG LOGITRACK] Query fetchUserProfile retornou:', { data, error, status, totalRows: data?.length });

  if (error) {
    throw error;
  }

  const dataSingle = data && data.length === 1 ? data[0] : null;
  if (data && data.length > 1) {
    console.error('[ALERTA CRÍTICO] Múltiplos usuários encontrados para o mesmo ID! Duplicidade no banco.', { userId, data });
  }

  return dataSingle;
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
    .select('id, titulo, descricao, status, localizacao, prazo')
    .eq('atribuido_a', usuarioId)
    .order('data_limite', { ascending: true });

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
  const { data, error, status } = await supabase
    .from('jornadas')
    .select('id, status, origem, destino, iniciado_em, veiculo_id')
    .eq('motorista_id', usuarioId)
    .eq('status', 'Em andamento')
    .order('iniciado_em', { ascending: false })
    .limit(1);

  console.log('[DEBUG LOGITRACK] Query fetchActiveJourney retornou:', { data, error, status, totalRows: data?.length });

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  const dataSingle = data && data.length === 1 ? data[0] : null;
  if (data && data.length > 1) {
    console.error('[ALERTA CRÍTICO] Múltiplas jornadas em andamento encontradas para o mesmo usuário!', { usuarioId, data });
  }

  return dataSingle;
}

export async function fetchJourneyById(jornadaId) {
  const { data, error, status } = await supabase
    .from('jornadas')
    .select('id, status, origem, destino, iniciado_em, encerrado_em, veiculo_id')
    .eq('id', jornadaId);

  console.log('[DEBUG LOGITRACK] Query fetchJourneyById retornou:', { data, error, status, totalRows: data?.length });

  if (error) {
    throw error;
  }

  const dataSingle = data && data.length === 1 ? data[0] : null;
  if (data && data.length > 1) {
    console.error('[ALERTA CRÍTICO] Múltiplas jornadas encontradas para o mesmo ID!', { jornadaId, data });
  }

  return dataSingle;
}

export async function fetchVeiculoById(veiculoId) {
  const { data, error, status } = await supabase
    .from('veiculos')
    .select('id, placa, modelo, status, localizacao, eta')
    .eq('id', veiculoId);

  console.log('[DEBUG LOGITRACK] Query fetchVeiculoById retornou:', { data, error, status, totalRows: data?.length });

  if (error) {
    throw error;
  }

  const dataSingle = data && data.length === 1 ? data[0] : null;
  if (data && data.length > 1) {
    console.error('[ALERTA CRÍTICO] Múltiplos veículos encontrados para o mesmo ID!', { veiculoId, data });
  }

  return dataSingle;
}

export async function createJourneyAndCheckin({ usuarioId, veiculoId, kmInicial, nivelCombustivel, selfieUrl, placaUrl, origem, destino }) {
  try {
    // ============================================
    // 1. VALIDAÇÃO DE ENTRADA
    // ============================================
    console.log('[LOGITRACK] Iniciando createJourneyAndCheckin com params:', {
      usuarioId,
      veiculoId,
      kmInicial,
      origem,
      destino,
    });

    // Validar usuarioId
    if (!usuarioId || typeof usuarioId !== 'string' || usuarioId.trim() === '') {
      const errorMsg = `[ERRO VALIDAÇÃO] usuarioId inválido ou nulo: ${usuarioId}`;
      console.error(errorMsg);
      throw new Error('usuarioId não fornecido. Faça login novamente.');
    }

    // Validar veiculoId
    // Converter para string se necessário (pode vir como UUID ou número do Supabase)
    const veiculoIdStr = String(veiculoId).trim();
    if (!veiculoId || veiculoIdStr === '' || veiculoIdStr === 'undefined' || veiculoIdStr === 'null') {
      const errorMsg = `[ERRO VALIDAÇÃO] veiculoId inválido ou nulo: ${veiculoId}`;
      console.error(errorMsg);
      throw new Error('Selecione um veículo válido antes de iniciar o check-in.');
    }

    // Validar kmInicial
    const kmNumerico = Number(kmInicial);
    if (isNaN(kmNumerico) || kmNumerico < 0) {
      const errorMsg = `[ERRO VALIDAÇÃO] kmInicial inválido: ${kmInicial}`;
      console.error(errorMsg);
      throw new Error('KM inicial deve ser um número válido e maior que zero.');
    }

    // Validar origem e destino
    if (!origem || typeof origem !== 'string' || origem.trim() === '') {
      const errorMsg = `[ERRO VALIDAÇÃO] origem inválida ou nula: ${origem}`;
      console.error(errorMsg);
      throw new Error('Origem da jornada é obrigatória.');
    }

    if (!destino || typeof destino !== 'string' || destino.trim() === '') {
      const errorMsg = `[ERRO VALIDAÇÃO] destino inválida ou nula: ${destino}`;
      console.error(errorMsg);
      throw new Error('Destino da jornada é obrigatório.');
    }

    // ============================================
    // 2. INSERT NA TABELA JORNADAS
    // ============================================
    console.log('[LOGITRACK] Inserindo nova jornada no banco de dados...');

    const agora = new Date().toISOString();
    const { data: jornada, error: jornadaError } = await supabase
      .from('jornadas')
      .insert([
        {
          motorista_id: usuarioId,
          veiculo_id: parseInt(veiculoIdStr) || veiculoIdStr,
          origem: origem.trim(),
          destino: destino.trim(),
          status: 'Em andamento',
          iniciado_em: agora,
          chegada_estimada: agora,
          km_inicial: kmNumerico,
        },
      ])
      .select('id')
      .single(); // Use .single() em vez de .maybeSingle() para garantir um resultado

    if (jornadaError) {
      const errorDetails = {
        message: jornadaError.message,
        code: jornadaError.code,
        details: jornadaError.details,
        hint: jornadaError.hint,
      };
      console.error('[ERRO PostgreSQL] Falha ao criar jornada:', errorDetails);

      // Mapear erros comuns do PostgreSQL para mensagens user-friendly
      if (jornadaError.message?.includes('foreign key')) {
        throw new Error('Erro: usuário ou veículo não encontrado no sistema. Tente fazer login novamente.');
      }
      if (jornadaError.message?.includes('not-null constraint')) {
        throw new Error('Erro: campos obrigatórios faltando. Preenchimento incorreto.');
      }
      if (jornadaError.code === 'PGRST116') {
        throw new Error('Erro: nenhuma jornada foi criada. Tente novamente.');
      }

      throw new Error(`Erro ao criar jornada: ${jornadaError.message}`);
    }

    // Validar se jornada foi realmente criada
    if (!jornada || !jornada.id) {
      const errorMsg = '[ERRO CRÍTICO] Insert retornou sem ID de jornada. Jornada é nula.';
      console.error(errorMsg);
      throw new Error('Erro ao criar jornada: ID não foi retornado. Contate o suporte.');
    }

    console.log('[LOGITRACK] Jornada criada com sucesso. ID:', jornada.id);

    // ============================================
    // 3. INSERT NA TABELA CHECKINS
    // ============================================
    console.log('[LOGITRACK] Inserindo dados de check-in...');

    const { error: checkinError } = await supabase.from('checkins').insert([
      {
        jornada_id: jornada.id,
        veiculo_id: parseInt(veiculoIdStr) || veiculoIdStr,
        km: kmNumerico,
        nivel_combustivel: parseFloat(nivelCombustivel) || 0,
        selfie_uri: selfieUrl || 'sem-imagem',
        foto_placa_uri: placaUrl || 'sem-imagem',
        data_hora: new Date().toISOString(),
      },
    ]);

    if (checkinError) {
      const errorDetails = {
        message: checkinError.message,
        code: checkinError.code,
        details: checkinError.details,
        hint: checkinError.hint,
      };
      console.error('[ERRO PostgreSQL] Falha ao criar check-in:', errorDetails);

      // Se checkin falhar, a jornada já foi criada mas sem check-in associado (inconsistência)
      console.warn('[AVISO] Jornada foi criada mas check-in falhou. Estado inconsistente para jornada ID:', jornada.id);

      throw new Error(`Erro ao registrar check-in: ${checkinError.message}`);
    }

    console.log('[LOGITRACK] Check-in registrado com sucesso.');

    // ============================================
    // 4. ATUALIZAR STATUS DO VEÍCULO
    // ============================================
    console.log('[LOGITRACK] Atualizando status do veículo para "Em rota"...');

    const { error: veiculoError } = await supabase
      .from('veiculos')
      .update({ status: 'Em rota' })
      .eq('id', parseInt(veiculoIdStr) || veiculoIdStr);

    if (veiculoError) {
      console.error('[AVISO] Falha ao atualizar status do veículo:', veiculoError.message);
      // Não lançar erro aqui, pois jornada e check-in já foram criados
      // O status do veículo é secundário
    } else {
      console.log('[LOGITRACK] Status do veículo atualizado com sucesso.');
    }

    // ============================================
    // 5. RETORNO DE SUCESSO
    // ============================================
    console.log('[LOGITRACK] Jornada e check-in criados com sucesso! Retornando dados...');
    return {
      success: true,
      jornadaId: jornada.id,
      message: 'Jornada iniciada com sucesso!',
    };
  } catch (error) {
    // Log detalhado do erro para debug
    console.error('[ERRO CRÍTICO] Exceção em createJourneyAndCheckin:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // Re-lançar erro para ser capturado na tela
    throw error;
  }
}

export async function finishJourney({ jornadaId, veiculoId, kmFinal, observacoes, selfieUrl, veiculoFotoUrl }) {
  try {
    console.log('[LOGITRACK] Iniciando finishJourney com params:', {
      jornadaId,
      veiculoId,
      kmFinal,
    });

    // Validar entrada
    if (!jornadaId) {
      throw new Error('jornadaId não fornecido.');
    }

    const veiculoIdInt = parseInt(veiculoId) || veiculoId;

    const parsedKm = Number(kmFinal);
    if (isNaN(parsedKm) || parsedKm < 0) {
      throw new Error('O valor de KM final informado é inválido. Apenas números são permitidos.');
    }

    // ============================================
    // 1. INSERT NA TABELA CHECKOUTS
    // ============================================
    console.log('[LOGITRACK] Inserindo checkout...');

    const { error: checkoutError } = await supabase.from('checkouts').insert([
      {
        jornada_id: jornadaId,
        veiculo_id: veiculoIdInt,
        observacoes: observacoes || null,
        selfie_uri: selfieUrl || 'sem-imagem',
        foto_veiculo_uri: veiculoFotoUrl || 'sem-imagem',
        data_hora: new Date().toISOString(),
      },
    ]);

    if (checkoutError) {
      console.error('[ERRO PostgreSQL] Falha ao criar checkout:', checkoutError);
      throw new Error(`Erro de Banco (Checkout): ${checkoutError.message}`);
    }

    console.log('[LOGITRACK] Checkout registrado com sucesso.');

    // ============================================
    // 2. ATUALIZAR STATUS DA JORNADA
    // ============================================
    console.log('[LOGITRACK] Finalizando jornada...');

    const { error: jornadaError } = await supabase
      .from('jornadas')
      .update({ 
        status: 'Finalizada', 
        encerrado_em: new Date().toISOString(),
        km_final: parsedKm,
      })
      .eq('id', jornadaId);

    if (jornadaError) {
      console.error('[ERRO PostgreSQL] Falha ao atualizar jornada:', jornadaError);
      throw new Error(`Erro de Banco (Jornada): ${jornadaError.message}`);
    }

    console.log('[LOGITRACK] Jornada finalizada com sucesso.');

    // ============================================
    // 3. ATUALIZAR STATUS DO VEÍCULO
    // ============================================
    console.log('[LOGITRACK] Atualizando status do veículo para "Disponível"...');

    const { error: veiculoError } = await supabase
      .from('veiculos')
      .update({ status: 'Disponível' })
      .eq('id', veiculoIdInt);

    if (veiculoError) {
      console.warn('[AVISO] Falha ao atualizar status do veículo:', veiculoError.message);
    }

    console.log('[LOGITRACK] Jornada e checkout finalizados com sucesso!');
    return { success: true };
  } catch (error) {
    console.error('[ERRO CRÍTICO] Exceção em finishJourney:', {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
