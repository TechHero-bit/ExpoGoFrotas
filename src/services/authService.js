import { supabase } from './supabase';

export async function signUp({ nome, telefone, email, password }) {
  const response = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nome, telefone },
      emailRedirectTo: 'logitrack://auth-callback'
    }
  });

  console.log('[DEBUG LOGITRACK] signUp response:', response);

  if (response.error) {
    throw response.error;
  }

  return response.data;
}

export async function signIn({ email, password }) {
  const response = await supabase.auth.signInWithPassword({ email, password });
  console.log('[DEBUG LOGITRACK] signIn response:', response);

  if (response.error) {
    throw response.error;
  }

  return response.data;
}

export async function signOut() {
  const response = await supabase.auth.signOut();
  if (response.error) {
    throw response.error;
  }
  return response;
}

export async function getCurrentSession() {
  const response = await supabase.auth.getSession();
  console.log('[DEBUG LOGITRACK] getCurrentSession response:', response);
  if (response.error) {
    throw response.error;
  }
  return response.data?.session ?? null;
}
