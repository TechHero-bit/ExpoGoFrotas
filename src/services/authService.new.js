import { supabase } from './supabase';

/**
 * Fazer signup de novo usuário
 * Configurado para enviar email de confirmação com deep link
 */
export async function signUp({ nome, telefone, email, password }) {
  try {
    const response = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, telefone },
        // ✅ NOVO: Redirecionar para deep link após confirmar email
        // O Supabase vai enviar um email com link: https://seudominio.com/auth/callback
        // Que será interceptado e redirecionado para: logitrack://auth-callback#access_token=...
        emailRedirectTo: 'logitrack://auth-callback'
      }
    });

    if (response.error) {
      throw response.error;
    }

    return response.data;
  } catch (error) {
    console.error('❌ Erro no signup:', error);
    throw error;
  }
}

/**
 * Fazer login com email e senha
 */
export async function signIn({ email, password }) {
  try {
    const response = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (response.error) {
      throw response.error;
    }

    return response.data;
  } catch (error) {
    console.error('❌ Erro no signin:', error);
    throw error;
  }
}

/**
 * Fazer logout do usuário atual
 */
export async function signOut() {
  try {
    const response = await supabase.auth.signOut();
    if (response.error) {
      throw response.error;
    }
    return response;
  } catch (error) {
    console.error('❌ Erro no logout:', error);
    throw error;
  }
}

/**
 * Obter sessão atual do usuário
 */
export async function getCurrentSession() {
  try {
    const response = await supabase.auth.getSession();
    if (response.error) {
      throw response.error;
    }
    return response.data?.session ?? null;
  } catch (error) {
    console.error('❌ Erro ao obter sessão:', error);
    throw error;
  }
}

/**
 * Fazer login usando tokens (usado internamente após deep link)
 * ✅ NOVO: Função auxiliar para setSession
 * 
 * @param {string} accessToken - Token de acesso do Supabase
 * @param {string} refreshToken - Token de refresh do Supabase
 */
export async function setSessionFromTokens(accessToken, refreshToken) {
  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    if (error) {
      throw error;
    }

    console.log('✅ Sessão definida com sucesso via tokens');
    return data?.session ?? null;
  } catch (error) {
    console.error('❌ Erro ao definir sessão com tokens:', error);
    throw error;
  }
}

/**
 * Solicitar recuperação de senha via email
 * Email conterá link: logitrack://auth-callback#access_token=...
 */
export async function resetPasswordForEmail(email) {
  try {
    const response = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'logitrack://auth-callback'
    });

    if (response.error) {
      throw response.error;
    }

    return response;
  } catch (error) {
    console.error('❌ Erro ao solicitar reset de senha:', error);
    throw error;
  }
}

/**
 * Atualizar senha do usuário (quando logado)
 */
export async function updatePassword(newPassword) {
  try {
    const response = await supabase.auth.updateUser({
      password: newPassword
    });

    if (response.error) {
      throw response.error;
    }

    console.log('✅ Senha atualizada com sucesso');
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao atualizar senha:', error);
    throw error;
  }
}
