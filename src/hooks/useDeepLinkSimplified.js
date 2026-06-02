import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabase';

/**
 * Versão simplificada do hook useDeepLink
 * Sem callbacks - apenas faz login se encontrar tokens na URL
 * 
 * Uso:
 * useDeepLinkSimplified();
 */
export function useDeepLinkSimplified() {
  useEffect(() => {
    const checkDeepLink = async () => {
      // ✅ Interceptar URL ao abrir app (cold start)
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('🔗 Deep Link recebido (cold start):', initialUrl);
        handleAuth(initialUrl);
      }
    };

    checkDeepLink();

    // ✅ Interceptar URL quando app está aberto (foreground/background)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('🔗 Deep Link recebido (aberto):', url);
      handleAuth(url);
    });

    return () => subscription.remove();
  }, []);

  /**
   * Extrai tokens da URL e faz login
   */
  const handleAuth = async (url) => {
    try {
      const { fragment, queryParams } = Linking.parse(url);
      
      let accessToken = null;
      let refreshToken = null;

      // Procurar tokens no fragment ou query string
      if (fragment) {
        const params = new URLSearchParams(fragment);
        accessToken = params.get('access_token');
        refreshToken = params.get('refresh_token');
      } else if (queryParams) {
        accessToken = queryParams.access_token;
        refreshToken = queryParams.refresh_token;
      }

      // Se encontrou tokens, fazer login
      if (accessToken && refreshToken) {
        console.log('✅ Tokens encontrados, fazendo login...');
        
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (error) {
          console.error('❌ Erro ao autenticar:', error.message);
        } else {
          console.log('✅ Autenticação bem-sucedida!');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao processar deep link:', error.message);
    }
  };
}

export default useDeepLinkSimplified;
