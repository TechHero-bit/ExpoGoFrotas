import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabase';

/**
 * Hook que intercepta deep links e processa autenticação com Supabase
 * 
 * Funcionalidades:
 * - Intercepta URLs de deep link quando o app é aberto (cold start)
 * - Intercepta URLs quando o app já está aberto (background/foreground)
 * - Extrai tokens da URL enviada pelo Supabase
 * - Faz login automático usando setSession()
 * - Executa callbacks de sucesso ou erro
 * 
 * Uso:
 * useDeepLink(
 *   () => { console.log('Login bem-sucedido') },
 *   (error) => { console.log('Erro:', error) }
 * )
 * 
 * @param {function} onAuthSuccess - Callback executado após autenticação bem-sucedida
 * @param {function} onError - Callback executado em caso de erro
 */
export function useDeepLink(onAuthSuccess, onError) {
  useEffect(() => {
    // ✅ PASSO 1: Lidar com URL quando app é aberto do zero (cold start)
    const handleInitialURL = async () => {
      const url = await Linking.getInitialURL();
      
      if (url != null) {
        console.log('🔗 [DEEP LINK] URL recebida no cold start:', url);
        await processDeepLink(url);
      }
    };

    handleInitialURL();

    // ✅ PASSO 2: Lidar com URLs quando app já está aberto (foreground/background)
    // Este listener detecta URLs recebidas enquanto o app está ativo
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('🔗 [DEEP LINK] URL recebida em background/foreground:', url);
      processDeepLink(url);
    });

    // Cleanup: remover listener quando componente é desmontado
    return () => {
      subscription.remove();
    };
  }, [onAuthSuccess, onError]);

  /**
   * Processa a URL recebida
   * 
   * Fluxo:
   * 1. Parsear a URL
   * 2. Extrair tokens do fragment (#) ou querystring (?)
   * 3. Validar tokens
   * 4. Chamar supabase.auth.setSession()
   * 5. Executar callback de sucesso ou erro
   */
  const processDeepLink = async (url) => {
    try {
      // ✅ PASSO 3: Extrair parâmetros da URL
      const parsed = Linking.parse(url);
      
      console.log('📍 [DEEP LINK] URL parseada:', {
        scheme: parsed.scheme,
        host: parsed.host,
        path: parsed.path,
        queryParams: parsed.queryParams,
        fragment: parsed.fragment?.substring(0, 50) + '...'
      });
      
      // O Supabase envia tokens de duas formas possíveis:
      // 1. No fragment: logitrack://#access_token=eyJ...&refresh_token=eyJ...
      // 2. Na query: logitrack://auth-callback?access_token=eyJ...&refresh_token=eyJ...
      
      const { queryParams, fragment } = parsed;
      
      let accessToken = null;
      let refreshToken = null;
      let tokenType = null;

      // Prioridade 1: Verificar se há tokens no fragment (after #)
      if (fragment) {
        console.log('🔍 [DEEP LINK] Procurando tokens no fragment');
        const params = new URLSearchParams(fragment);
        accessToken = params.get('access_token');
        refreshToken = params.get('refresh_token');
        tokenType = params.get('type'); // pode ser 'recovery', 'signup', 'magiclink', etc
      }
      
      // Prioridade 2: Se não encontrou no fragment, procurar na query string
      if (!accessToken && queryParams) {
        console.log('🔍 [DEEP LINK] Procurando tokens na query string');
        accessToken = queryParams.access_token;
        refreshToken = queryParams.refresh_token;
        tokenType = queryParams.type;
      }

      // Validação: ambos os tokens são necessários
      if (!accessToken || !refreshToken) {
        const errorMsg = 'Tokens ausentes na URL. Access Token: ' + (accessToken ? 'OK' : 'FALTANDO') + ', Refresh Token: ' + (refreshToken ? 'OK' : 'FALTANDO');
        console.warn('⚠️ [DEEP LINK] ' + errorMsg);
        onError?.(new Error(errorMsg));
        return;
      }

      console.log('✅ [DEEP LINK] Tokens encontrados com sucesso!', {
        accessToken: 'eyJ...' + accessToken.substring(accessToken.length - 10),
        refreshToken: 'eyJ...' + refreshToken.substring(refreshToken.length - 10),
        type: tokenType
      });

      // ✅ PASSO 4: Fazer login com os tokens no Supabase
      console.log('🔐 [DEEP LINK] Chamando supabase.auth.setSession()...');
      
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) {
        console.error('❌ [DEEP LINK] Erro ao definir sessão no Supabase:', error);
        onError?.(error);
        return;
      }

      console.log('✅ [DEEP LINK] Sessão definida com sucesso!');
      console.log('👤 [DEEP LINK] Usuário autenticado:', data.session?.user?.email);
      
      // ✅ PASSO 5: Executar callback de sucesso
      onAuthSuccess?.();

    } catch (error) {
      console.error('❌ [DEEP LINK] Erro inesperado ao processar deep link:', error.message);
      onError?.(error);
    }
  };
}

export default useDeepLink;
