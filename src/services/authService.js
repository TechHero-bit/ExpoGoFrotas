import { supabase } from './supabase';

export async function signUp({ nome, telefone, email, password }) {
  const response = await supabase.auth.signUp(
    { email, password },
    { data: { nome, telefone } }
  );

  if (response.error) {
    throw response.error;
  }

  return response.data;
}

export async function signIn({ email, password }) {
  const response = await supabase.auth.signInWithPassword({ email, password });

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
  if (response.error) {
    throw response.error;
  }
  return response.data?.session ?? null;
}
