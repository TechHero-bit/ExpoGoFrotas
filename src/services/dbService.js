import { Alert } from 'react-native';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

/**
 * Função utilitária para fazer upload de imagens para o Supabase Storage
 * usando ArrayBuffer (mais estável no React Native que FormData).
 */
async function uploadImageToSupabase(imageAsset, prefix) {
  if (!imageAsset || !imageAsset.uri || imageAsset.uri === 'sem-imagem') {
    return null;
  }

  try {
    const { uri, base64 } = imageAsset;
    const ext = uri.split('.').pop() || 'jpg';
    const fileName = `${prefix}_${Date.now()}.${ext}`;
    const filePath = `Imagens de check-in e check-out/${fileName}`;
    const contentType = `image/${ext === 'png' ? 'png' : 'jpeg'}`;

    console.log(`[LOGITRACK] Iniciando upload: ${fileName} (${contentType})`);

    let uploadData;

    if (base64) {
      // Método robusto: ArrayBuffer via base64
      uploadData = decode(base64);
    } else {
      // Fallback: Blob via fetch (se base64 não estiver disponível)
      const response = await fetch(uri);
      uploadData = await response.blob();
    }

    const { error: uploadError } = await supabase.storage
      .from('evidencias')
      .upload(filePath, uploadData, {
        contentType: contentType,
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicData, error: publicUrlError } = await supabase.storage
      .from('evidencias')
      .getPublicUrl(filePath);

    if (publicUrlError || !publicData?.publicUrl) {
      throw publicUrlError || new Error('Falha ao obter a URL pública da imagem.');
    }

    console.log(`[LOGITRACK] Upload concluído: ${publicData.publicUrl}`);
    return { publicUrl: publicData.publicUrl, path: filePath };
  } catch (error) {
    console.error('[UPLOAD SUPABASE] Falha ao enviar imagem:', error);
    throw new Error(error.message || 'Falha ao enviar imagem para o storage.');
  }
}


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
    .select('id, status, origem, destino, origem_latitude, origem_longitude, destino_latitude, destino_longitude, iniciado_em, veiculo_id')
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
    .select('id, status, origem, destino, origem_latitude, origem_longitude, destino_latitude, destino_longitude, iniciado_em, encerrado_em, veiculo_id')
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

export async function createJourneyAndCheckin({ usuarioId, veiculoId, kmInicial, nivelCombustivel, selfieUrl, fotosVeiculoUrl = [], painelUrl, origem, destino, origemCoords, destinoCoords }) {
  try {
    // ============================================
    // 1. VALIDAÇÃO DE ENTRADA
    // ============================================
    console.log('[LOGITRACK] Iniciando createJourneyAndCheckin com params:', {
      usuarioId,
      veiculoId,
      kmInicial,
      nivelCombustivel,
      painelUrl,
      origem,
      destino,
      origemCoords,
      destinoCoords,
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

    // Verificar se já existe uma jornada em andamento para este veículo
    const { data: existingActive, error: existingError } = await supabase
      .from('jornadas')
      .select('id')
      .eq('veiculo_id', parseInt(veiculoIdStr) || veiculoIdStr)
      .eq('status', 'Em andamento')
      .limit(1);

    if (existingError) {
      console.warn('[LOGITRACK] Aviso ao verificar jornada ativa:', existingError.message || existingError);
    }

    if (existingActive && existingActive.length) {
      throw new Error('Já existe uma jornada em andamento para este veículo.');
    }

    const agora = new Date().toISOString();
    const { data: jornada, error: jornadaError } = await supabase
      .from('jornadas')
      .insert([
        {
          motorista_id: usuarioId,
          veiculo_id: parseInt(veiculoIdStr) || veiculoIdStr,
          origem: origem.trim(),
          destino: destino.trim(),
          origem_latitude: origemCoords?.latitude ?? null,
          origem_longitude: origemCoords?.longitude ?? null,
          destino_latitude: destinoCoords?.latitude ?? null,
          destino_longitude: destinoCoords?.longitude ?? null,
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
    // 3. UPLOAD DE IMAGENS E INSERT NA TABELA CHECKINS
    //     Fazemos upload e, em caso de falha subsequente, removemos arquivos e a jornada criada
    // ============================================
    console.log('[LOGITRACK] Realizando upload das fotos de check-in...');

    const uploadedPaths = [];
    try {
      const selfieUpload = selfieUrl ? await uploadImageToSupabase(selfieUrl, `checkin_selfie_${jornada.id}`) : null;
      const painelUpload = painelUrl ? await uploadImageToSupabase(painelUrl, `checkin_painel_${jornada.id}`) : null;

      const fotosVeiculoUrls = [];
      for (let i = 0; i < fotosVeiculoUrl.length; i++) {
        if (fotosVeiculoUrl[i]) {
          const upload = await uploadImageToSupabase(fotosVeiculoUrl[i], `checkin_veiculo_${jornada.id}_${i}`);
          if (upload) {
            fotosVeiculoUrls.push(upload.publicUrl);
            uploadedPaths.push(upload.path);
          }
        }
      }

      const finalSelfieUrl = selfieUpload ? selfieUpload.publicUrl : null;
      const finalPlacaUrl = fotosVeiculoUrls.length > 0 ? fotosVeiculoUrls.join(',') : null;
      const finalPainelUrl = painelUpload ? painelUpload.publicUrl : null;

      if (selfieUpload && selfieUpload.path) uploadedPaths.push(selfieUpload.path);
      if (painelUpload && painelUpload.path) uploadedPaths.push(painelUpload.path);

      console.log('[LOGITRACK] Inserindo dados de check-in...');

      const { data: checkin, error: checkinError } = await supabase.from('checkins').insert([
        {
          jornada_id: jornada.id,
          veiculo_id: parseInt(veiculoIdStr) || veiculoIdStr,
          km: kmNumerico,
          nivel_combustivel: nivelCombustivel.trim(),
          selfie_uri: finalSelfieUrl,
          foto_placa_uri: finalPlacaUrl,
          foto_painel_uri: finalPainelUrl,
          data_hora: new Date().toISOString(),
        },
      ]).select('id').single();

      if (checkinError) {
        const errorDetails = {
          message: checkinError.message,
          code: checkinError.code,
          details: checkinError.details,
          hint: checkinError.hint,
        };
        console.error('[ERRO PostgreSQL] Falha ao criar check-in:', errorDetails);

        // Se checkin falhar, faremos limpeza: remover arquivos enviados e excluir a jornada criada
        if (uploadedPaths.length) {
          try {
            await supabase.storage.from('evidencias').remove(uploadedPaths);
            console.log('[LOGITRACK] Arquivos enviados removidos após falha no check-in.');
          } catch (remErr) {
            console.warn('[LOGITRACK] Falha ao remover arquivos após erro no check-in:', remErr.message || remErr);
          }
        }

        try {
          await supabase.from('jornadas').delete().eq('id', jornada.id);
          console.log('[LOGITRACK] Jornada criada removida após falha no check-in.');
        } catch (delErr) {
          console.warn('[LOGITRACK] Falha ao remover jornada após erro no check-in:', delErr.message || delErr);
        }

        throw new Error(`Erro ao registrar check-in: ${checkinError.message}`);
      }

      const { error: jornadaCheckinError } = await supabase
        .from('jornadas')
        .update({ checkin_id: checkin.id })
        .eq('id', jornada.id);

      if (jornadaCheckinError) {
        console.error('[ERRO PostgreSQL] Falha ao vincular check-in na jornada:', jornadaCheckinError);
        throw new Error(`Erro ao vincular check-in na jornada: ${jornadaCheckinError.message}`);
      }

      console.log('[LOGITRACK] Check-in registrado com sucesso.');
    } catch (uploadOrInsertError) {
      // Se qualquer erro ocorrer durante upload ou insert, tentamos limpar o que foi parcial
      console.error('[LOGITRACK] Erro durante upload/inserção de check-in, realizando limpeza:', uploadOrInsertError.message || uploadOrInsertError);

      if (uploadedPaths.length) {
        try {
          await supabase.storage.from('evidencias').remove(uploadedPaths);
          console.log('[LOGITRACK] Arquivos enviados removidos no rollback.');
        } catch (remErr) {
          console.warn('[LOGITRACK] Falha ao remover arquivos no rollback:', remErr.message || remErr);
        }
      }

      try {
        if (jornada && jornada.id) {
          await supabase.from('jornadas').delete().eq('id', jornada.id);
          console.log('[LOGITRACK] Jornada criada removida no rollback.');
        }
      } catch (delErr) {
        console.warn('[LOGITRACK] Falha ao remover jornada no rollback:', delErr.message || delErr);
      }

      throw uploadOrInsertError;
    }

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

export async function finishJourney({ jornadaId, veiculoId, kmFinal, nivelCombustivel, observacoes, selfieUrl, fotosVeiculoUrl = [], painelUrl }) {
  try {
    console.log('[LOGITRACK] Iniciando finishJourney com params:', {
      jornadaId,
      veiculoId,
      kmFinal,
      nivelCombustivel,
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

    if (!nivelCombustivel || typeof nivelCombustivel !== 'string' || !nivelCombustivel.trim()) {
      throw new Error('Informe o nivel de combustivel do veiculo no check-out.');
    }

    // ============================================
    // 1. UPLOAD DE IMAGENS E INSERT NA TABELA CHECKOUTS
    // ============================================
    console.log('[LOGITRACK] Realizando upload das fotos de check-out...');
    const uploadedPaths = [];
    const selfieUpload = selfieUrl ? await uploadImageToSupabase(selfieUrl, `checkout_selfie_${jornadaId}`) : null;
    const painelUpload = painelUrl ? await uploadImageToSupabase(painelUrl, `checkout_painel_${veiculoIdInt}`) : null;

    const fotosVeiculoUrls = [];
    for (let i = 0; i < fotosVeiculoUrl.length; i++) {
      if (fotosVeiculoUrl[i]) {
        const upload = await uploadImageToSupabase(fotosVeiculoUrl[i], `checkout_veiculo_${jornadaId}_${i}`);
        if (upload) {
          fotosVeiculoUrls.push(upload.publicUrl);
          uploadedPaths.push(upload.path);
        }
      }
    }

    const finalSelfieUrl = selfieUpload ? selfieUpload.publicUrl : null;
    const finalVeiculoUrl = fotosVeiculoUrls.length > 0 ? fotosVeiculoUrls.join(',') : null;
    const finalPainelUrl = painelUpload ? painelUpload.publicUrl : null;

    if (selfieUpload && selfieUpload.path) uploadedPaths.push(selfieUpload.path);
    if (painelUpload && painelUpload.path) uploadedPaths.push(painelUpload.path);

    console.log('[LOGITRACK] Inserindo checkout...');

    const { data: checkout, error: checkoutError } = await supabase.from('checkouts').insert([
      {
        jornada_id: jornadaId,
        veiculo_id: veiculoIdInt,
        nivel_combustivel: nivelCombustivel.trim(),
        observacoes: observacoes || null,
        selfie_uri: finalSelfieUrl,
        foto_veiculo_uri: finalVeiculoUrl,
        foto_painel_uri: finalPainelUrl,
        data_hora: new Date().toISOString(),
      },
    ]).select('id').single();

    if (checkoutError) {
      console.error('[ERRO PostgreSQL] Falha ao criar checkout:', checkoutError);
      if (uploadedPaths.length) {
        try {
          await supabase.storage.from('evidencias').remove(uploadedPaths);
        } catch (removeError) {
          console.warn('[LOGITRACK] Falha ao remover arquivos apos erro no checkout:', removeError.message || removeError);
        }
      }
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
        checkout_id: checkout.id,
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

export async function fetchAllJourneys() {
  const { data: jornadas, error } = await supabase
    .from('jornadas')
    .select(`
      id,
      status,
      origem,
      destino,
      origem_latitude,
      origem_longitude,
      destino_latitude,
      destino_longitude,
      iniciado_em,
      encerrado_em,
      km_inicial,
      km_final,
      motorista_id,
      veiculo_id,
      checkin_id,
      checkout_id,
      usuarios!motorista_id ( nome ),
      veiculos!veiculo_id ( placa, modelo )
    `)
    .order('iniciado_em', { ascending: false });

  if (error) {
    throw error;
  }
  
  if (!jornadas || jornadas.length === 0) return [];

  // Buscar checkins e checkouts manualmente para evitar erro de Foreign Key não configurada no DB
  const jornadasIds = jornadas.map(j => j.id);
  
  const { data: checkins } = await supabase
    .from('checkins')
    .select('id, jornada_id, selfie_uri, foto_placa_uri, nivel_combustivel, foto_painel_uri')
    .in('jornada_id', jornadasIds);
    
  const { data: checkouts } = await supabase
    .from('checkouts')
    .select('id, jornada_id, selfie_uri, foto_veiculo_uri, nivel_combustivel, foto_painel_uri, observacoes')
    .in('jornada_id', jornadasIds);

  // Fazer o merge dos dados
  const checkinsList = checkins || [];
  const checkoutsList = checkouts || [];

  // Preferir os vinculos formais da jornada; manter jornada_id como fallback para registros antigos.
  const jornadasComFotos = jornadas.map(jornada => {
    const linkedCheckin = jornada.checkin_id
      ? checkinsList.find(c => c.id === jornada.checkin_id)
      : null;
    const linkedCheckout = jornada.checkout_id
      ? checkoutsList.find(c => c.id === jornada.checkout_id)
      : null;

    return {
      ...jornada,
      checkins: linkedCheckin ? [linkedCheckin] : checkinsList.filter(c => c.jornada_id === jornada.id),
      checkouts: linkedCheckout ? [linkedCheckout] : checkoutsList.filter(c => c.jornada_id === jornada.id)
    };
  });

  return jornadasComFotos;
}
